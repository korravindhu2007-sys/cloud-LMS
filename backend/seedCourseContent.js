import { getDatabase } from './config/db.js';
import { courseContentPlan } from './courseContentPlan.js';
import {
  createLesson,
  createMaterial,
  createModule,
  getModulesByCourse,
  updateLesson,
} from './models/courseContentModel.js';
import { createAssignment, getAssignmentsByCourse } from './models/assignmentModel.js';
import { writeGeneratedCourseGuide } from './services/courseUploadService.js';

const db = getDatabase();
const LESSON_CONTENT_PREFIX = 'CLOUDLMS_LESSON_V1:';

function parseLessonContent(content) {
  const value = String(content || '');
  if (!value.startsWith(LESSON_CONTENT_PREFIX)) return { description: value, youtubeUrl: '' };
  try {
    const parsed = JSON.parse(value.slice(LESSON_CONTENT_PREFIX.length));
    return { description: String(parsed.description || ''), youtubeUrl: String(parsed.youtubeUrl || '') };
  } catch {
    return { description: value, youtubeUrl: '' };
  }
}

function serializeLessonContent(description, youtubeUrl) {
  return youtubeUrl
    ? `${LESSON_CONTENT_PREFIX}${JSON.stringify({ description, youtubeUrl })}`
    : description;
}

function isIndividualYouTubeVideo(url) {
  try {
    const parsed = new URL(url);
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname.toLowerCase())
      && parsed.pathname === '/watch'
      && Boolean(parsed.searchParams.get('v'));
  } catch {
    return false;
  }
}

function getGuideMarkdown(course, plan) {
  const lessons = plan.lessons.map((item, index) => `${index + 1}. **${item.title}**\n   ${item.description}`).join('\n\n');
  return `# ${course.title} (${course.code})\n\n${course.description || 'Course field guide'}\n\n## Lesson sequence\n\n${lessons}\n\n## Practice\n\nUse the course practice assignment to explain the key ideas in your own words and support your answer with an example.\n`;
}

function getFallbackStudioPlan(course) {
  if (!/^Applied Computing Studio [12]$/.test(course.title) || !String(course.code).startsWith('FAC')) return null;

  const focusByFaculty = {
    'faculty1': 'cloud architecture',
    'anuj.kapoor': 'cloud-native operations',
    'divya.menon': 'data visualization',
    'farhan.ali': 'application security',
    'gita.iyer': 'human-centered design',
    'kiran.das': 'machine learning',
    'leena.thomas': 'mobile applications',
    'mohit.arora': 'network architecture',
    'neha.bansal': 'database systems',
    'rakesh.sinha': 'web engineering',
    'shalini.nair': 'software quality',
    'asha.verma': 'applied systems',
  };
  const focus = focusByFaculty[course.facultyUsername] || 'applied computing';
  const studio = course.title.endsWith(' 1') ? 'design and implementation' : 'integration and evaluation';
  return {
    lessons: [
      { title: `${studio} in ${focus}`, description: `Frame a practical ${focus} problem with measurable requirements and constraints.` },
      { title: `Prototype a ${focus} solution`, description: `Build a small ${focus} prototype and validate it with representative examples.` },
      { title: `Review and communicate ${focus} outcomes`, description: `Evaluate trade-offs in the ${focus} solution and prepare a clear technical handoff.` },
    ],
  };
}

export async function seedCourseContent() {
  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.description, u.username AS facultyUsername
    FROM courses c
    JOIN users u ON u.id = c.faculty_id
    ORDER BY c.id
  `).all();
  const result = {
    coursesProcessed: 0,
    coursesWithoutPlan: [],
    lessonsInserted: 0,
    lessonsUpdated: 0,
    lessonsSkippedAtLimit: 0,
    materialsInserted: 0,
    assignmentsInserted: 0,
  };

  for (const course of courses) {
    const plan = courseContentPlan[course.code] || getFallbackStudioPlan(course);
    if (!plan) {
      result.coursesWithoutPlan.push({ code: course.code, title: course.title });
      continue;
    }
    result.coursesProcessed += 1;

    let modules = getModulesByCourse(course.id);
    let targetModule = modules.find((module) => module.title === 'Course Learning Path') || modules[0];
    if (!targetModule) {
      targetModule = createModule(course.id, {
        title: 'Course Learning Path',
        description: `Lessons for ${course.title}.`,
      });
      targetModule.lessons = [];
    }

    const existingLessons = modules.flatMap((module) => module.lessons || []);
    let nextOrder = Math.max(0, ...((targetModule.lessons || []).map((item) => Number(item.lesson_order) || 0))) + 1;

    for (const plannedLesson of plan.lessons) {
      if (plannedLesson.youtubeUrl && !isIndividualYouTubeVideo(plannedLesson.youtubeUrl)) {
        throw new Error(`Refusing an unverified YouTube URL in ${course.code}: ${plannedLesson.title}`);
      }

      const existing = existingLessons.find((item) => item.title.trim().toLowerCase() === plannedLesson.title.trim().toLowerCase());
      if (existing) {
        const current = parseLessonContent(existing.content);
        const currentVideo = current.youtubeUrl.includes('/results?search_query=') ? '' : current.youtubeUrl;
        const youtubeUrl = plannedLesson.youtubeUrl || (isIndividualYouTubeVideo(currentVideo) ? currentVideo : '');
        const description = current.description.trim() || plannedLesson.description;
        const content = serializeLessonContent(description, youtubeUrl);
        if (content !== String(existing.content || '')) {
          updateLesson(existing.id, { content });
          result.lessonsUpdated += 1;
        }
        continue;
      }

      if (existingLessons.length >= 5) {
        result.lessonsSkippedAtLimit += 1;
        continue;
      }

      const content = serializeLessonContent(plannedLesson.description, plannedLesson.youtubeUrl);
      const inserted = createLesson(targetModule.id, {
        title: plannedLesson.title,
        content,
        lessonOrder: nextOrder,
      });
      existingLessons.push(inserted);
      targetModule.lessons.push(inserted);
      nextOrder += 1;
      result.lessonsInserted += 1;
    }

    const guideTitle = `${course.title} Course Field Guide`;
    const guideExists = db.prepare('SELECT id FROM materials WHERE course_id = ? AND title = ?').get(course.id, guideTitle);
    if (!guideExists) {
      const storageKey = await writeGeneratedCourseGuide(course.id, getGuideMarkdown(course, plan));
      createMaterial(course.id, { title: guideTitle, fileUrl: storageKey, fileType: 'notes' });
      result.materialsInserted += 1;
    }

    const assignmentTitle = `${course.title} Unit 1 Practice`;
    const assignmentExists = getAssignmentsByCourse(course.id).some((item) => item.title === assignmentTitle);
    if (!assignmentExists) {
      const firstLesson = plan.lessons[0];
      createAssignment(course.id, {
        title: assignmentTitle,
        description: `Explain ${firstLesson.title} and apply it to a realistic ${course.title} example. State your assumptions and support your reasoning.`,
        maxScore: 10,
        status: 'published',
      });
      result.assignmentsInserted += 1;
    }
  }

  return result;
}

if (process.argv[1]?.endsWith('seedCourseContent.js')) {
  const result = await seedCourseContent();
  console.log(`Content plan applied to ${result.coursesProcessed} courses.`);
  console.log(`Lessons: ${result.lessonsInserted} inserted, ${result.lessonsUpdated} updated.`);
  console.log(`Field guides: ${result.materialsInserted} inserted; practice assignments: ${result.assignmentsInserted} inserted.`);
  if (result.coursesWithoutPlan.length) {
    console.warn(`Courses without a content plan: ${result.coursesWithoutPlan.map((course) => `${course.code} (${course.title})`).join(', ')}`);
  }
}