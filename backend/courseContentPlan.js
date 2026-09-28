const lesson = (title, description, youtubeUrl = '') => ({ title, description, youtubeUrl });

export const courseContentPlan = {
  CLOUD101: {
    lessons: [
      lesson('What is cloud computing?', 'Understand on-demand access to shared compute, storage, and networking resources.'),
      lesson('Cloud service models', 'Compare infrastructure, platform, and software services and the responsibilities each one leaves to the customer.'),
      lesson('Cloud deployment models', 'Distinguish public, private, hybrid, and community deployments by ownership and access.'),
      lesson('Infrastructure as a Service (IaaS)', 'Explore virtual machines, networking, and storage as configurable cloud infrastructure.', 'https://www.youtube.com/watch?v=dJMFzuXjLas'),
      lesson('Virtualization basics', 'Relate hypervisors and virtual machines to resource pooling and cloud elasticity.'),
    ],
  },
  DSA201: {
    lessons: [
      lesson('Introduction to data structures and algorithms', 'Learn how data structures organize information and algorithms operate on it.', 'https://www.youtube.com/watch?v=SGDS6NFN-_U'),
      lesson('Complexity analysis', 'Use time and space complexity to compare approaches as input size grows.'),
      lesson('Arrays and memory representation', 'Trace array indexing and contiguous memory representation.', 'https://www.youtube.com/watch?v=AT14lCXuMKI'),
      lesson('Array operations', 'Compare traversal, insertion, deletion, and search costs in arrays.', 'https://www.youtube.com/watch?v=Bnjbun-hiBk'),
      lesson('Trees and graph traversal', 'Model hierarchical and connected data and select a suitable traversal strategy.'),
    ],
  },
  'CLOUD-101': {
    lessons: [
      lesson('Cloud architecture foundations', 'Identify the compute, network, storage, and identity layers in a cloud solution.'),
      lesson('Designing for availability', 'Use redundancy, health checks, and recovery planning to reduce service interruption.'),
      lesson('Scaling and capacity planning', 'Select vertical or horizontal scaling based on workload behavior.'),
      lesson('Cloud cost and governance', 'Use budgets, tagging, and least privilege to govern cloud resources.'),
    ],
  },
  SE301: {
    lessons: [
      lesson('Requirement gathering', 'Capture stakeholder needs as testable functional and quality requirements.'),
      lesson('Design thinking', 'Move from a defined problem through ideas and prototypes to feedback.'),
      lesson('Testing strategies', 'Choose unit, integration, and acceptance checks that match the risks of a release.'),
    ],
  },
  CNE401: {
    lessons: [
      lesson('Cloud-native architecture', 'Recognize the resilience, automation, and operational practices behind cloud-native systems.'),
      lesson('Service decomposition', 'Set service boundaries around cohesive capabilities and explicit contracts.'),
      lesson('Containers and images', 'Package an application and its dependencies into a reproducible container image.'),
      lesson('Observability fundamentals', 'Use logs, metrics, and traces to investigate distributed service behavior.'),
    ],
  },
  CNE402: {
    lessons: [
      lesson('Kubernetes architecture', 'Describe the control plane, worker nodes, and reconciliation loop.'),
      lesson('Pods, deployments, and services', 'Deploy replicated workloads and expose stable network endpoints.'),
      lesson('Configuration and secrets', 'Separate application configuration from images and protect sensitive values.'),
      lesson('Scaling and rollout operations', 'Perform safe rolling updates, rollback, and workload scaling.'),
    ],
  },
  DVA401: {
    lessons: [
      lesson('Choosing visual encodings', 'Match data types and analytical questions to effective visual encodings.'),
      lesson('Chart selection and comparison', 'Choose charts that reveal comparisons, distributions, and relationships.'),
      lesson('Building a data narrative', 'Arrange evidence and annotations into a clear analytical story.'),
      lesson('Dashboard usability', 'Design dashboard hierarchy, filters, and labels for the intended audience.'),
    ],
  },
  DVA402: {
    lessons: [
      lesson('Business intelligence lifecycle', 'Connect source systems, data preparation, analysis, and decision-making.'),
      lesson('Metrics and KPI definitions', 'Define measurable indicators with clear owners, formulas, and reporting periods.'),
      lesson('Dimensional reporting models', 'Organize measures and dimensions for consistent business analysis.'),
      lesson('Dashboard design and governance', 'Build a governed report that supports repeatable operational decisions.'),
    ],
  },
  CYS401: {
    lessons: [
      lesson('Security principles and risk', 'Apply confidentiality, integrity, and availability to practical risk scenarios.'),
      lesson('Threat modeling', 'Identify assets, trust boundaries, threats, and mitigations before implementation.'),
      lesson('Network defense fundamentals', 'Use segmentation, filtering, and monitoring to reduce network exposure.'),
      lesson('Incident response lifecycle', 'Prepare, detect, contain, recover, and learn from a security incident.'),
    ],
  },
  CYS402: {
    lessons: [
      lesson('Secure development lifecycle', 'Place security requirements and review activities throughout software delivery.'),
      lesson('Input validation and injection defense', 'Validate untrusted input and use safe query and output-encoding practices.'),
      lesson('Authentication and session security', 'Protect identity, credentials, and session state in web applications.'),
      lesson('Application security testing', 'Combine dependency, static, dynamic, and manual checks for application risk.'),
    ],
  },
  UXD401: {
    lessons: [
      lesson('Human-centered design process', 'Frame design around user needs, context, and iterative evaluation.'),
      lesson('User research methods', 'Select interviews, observation, and surveys to answer a research question.'),
      lesson('Synthesis and problem framing', 'Turn research evidence into useful themes, needs, and design opportunities.'),
      lesson('Prototyping and accessibility', 'Prototype a solution and check it against inclusive design needs.'),
    ],
  },
  UXD402: {
    lessons: [
      lesson('Interaction patterns and feedback', 'Design control behavior and feedback that make system state understandable.'),
      lesson('Interaction states and flows', 'Map states, transitions, and error paths in a user journey.'),
      lesson('Prototyping interactions', 'Use a prototype to test timing, navigation, and interaction assumptions.'),
      lesson('Accessible interaction design', 'Support keyboard, screen-reader, and reduced-motion interaction.'),
    ],
  },
  AIM401: {
    lessons: [
      lesson('Machine learning problem framing', 'Translate a prediction or grouping need into a measurable learning task.'),
      lesson('Supervised and unsupervised learning', 'Compare labeled prediction with structure discovery in unlabeled data.'),
      lesson('Training and generalization', 'Separate training behavior from performance on unseen data.'),
      lesson('Evaluation and model limits', 'Choose evaluation measures and recognize data or model limitations.'),
    ],
  },
  AIM402: {
    lessons: [
      lesson('Feature preparation', 'Prepare features while preserving data meaning and avoiding target leakage.'),
      lesson('Regression and classification workflows', 'Select a predictive approach based on outcome type and decision need.'),
      lesson('Validation and error analysis', 'Use validation data and error slices to assess model reliability.'),
      lesson('Prediction deployment and monitoring', 'Track deployed prediction quality as data and usage change.'),
    ],
  },
  MOB401: {
    lessons: [
      lesson('Mobile application architecture', 'Separate presentation, domain behavior, and platform integration.'),
      lesson('Mobile lifecycle and navigation', 'Handle lifecycle transitions and navigation without losing user state.'),
      lesson('Local storage and network access', 'Manage cached data, connectivity, and safe service communication.'),
      lesson('Mobile quality and release', 'Test device behavior and prepare a reliable application release.'),
    ],
  },
  MOB402: {
    lessons: [
      lesson('Cross-platform interface foundations', 'Share interface behavior while respecting platform conventions.'),
      lesson('Components and state', 'Structure reusable UI components and predictable application state.'),
      lesson('Native APIs and device capabilities', 'Integrate platform capabilities through stable abstractions.'),
      lesson('Cross-platform performance', 'Profile rendering and reduce unnecessary work on constrained devices.'),
    ],
  },
  NET401: {
    lessons: [
      lesson('Network models and protocols', 'Relate protocol layers to addressing, transport, and application behavior.'),
      lesson('IP addressing and subnetting', 'Plan address ranges and subnet boundaries for a network.'),
      lesson('Routing and switching', 'Explain how forwarding decisions move traffic across connected networks.'),
      lesson('Resilient network architecture', 'Design redundant paths and capacity for reliable network services.'),
    ],
  },
  NET402: {
    lessons: [
      lesson('Cloud network boundaries', 'Map virtual networks, subnets, gateways, and service endpoints.'),
      lesson('Network identity and access', 'Apply identity-aware rules and least privilege to network access.'),
      lesson('Segmentation and traffic controls', 'Limit lateral movement with layered network segmentation.'),
      lesson('Cloud network monitoring', 'Use flow logs and alerts to investigate network exposure.'),
    ],
  },
  DBE401: {
    lessons: [
      lesson('Relational modeling and keys', 'Represent entities and relationships with well-defined keys.'),
      lesson('Normalization and integrity', 'Reduce update anomalies while preserving useful integrity rules.'),
      lesson('SQL queries and indexes', 'Write relational queries and use indexes to support common access patterns.'),
      lesson('Transactions and concurrency', 'Use transaction boundaries and isolation to protect data consistency.'),
    ],
  },
  DBE402: {
    lessons: [
      lesson('Data pipeline architecture', 'Separate ingestion, transformation, storage, and delivery responsibilities.'),
      lesson('Batch and streaming ingestion', 'Choose an ingestion approach based on latency and throughput needs.'),
      lesson('Transformation and orchestration', 'Make pipeline transformations repeatable and schedule dependencies.'),
      lesson('Data quality and lineage', 'Validate records and trace data from source through downstream use.'),
    ],
  },
  WEB401: {
    lessons: [
      lesson('Modern web platform foundations', 'Understand the browser runtime, document structure, and rendering pipeline.'),
      lesson('Responsive and accessible interfaces', 'Build layouts that adapt to device sizes and accessible input.'),
      lesson('Web APIs and application state', 'Connect interface state to asynchronous API operations.'),
      lesson('Web performance and security', 'Reduce unnecessary work and apply secure browser-facing patterns.'),
    ],
  },
  WEB402: {
    lessons: [
      lesson('Full-stack application boundaries', 'Define contracts between the browser, server, and persistence layer.'),
      lesson('REST APIs and validation', 'Design predictable API resources and validate incoming data.'),
      lesson('Persistence and authentication', 'Connect data access and identity checks to application workflows.'),
      lesson('Deployment and observability', 'Prepare a full-stack application for deployment and diagnosis.'),
    ],
  },
  QAE401: {
    lessons: [
      lesson('Quality engineering lifecycle', 'Relate prevention, detection, and feedback to the delivery lifecycle.'),
      lesson('Test design and coverage', 'Choose test cases based on risk, boundaries, and expected behavior.'),
      lesson('Reviews and defect analysis', 'Use review evidence and defect patterns to improve product quality.'),
      lesson('Continuous quality practices', 'Connect automated checks to rapid, reliable delivery feedback.'),
    ],
  },
  QAE402: {
    lessons: [
      lesson('Browser automation foundations', 'Structure browser checks around observable user behavior.'),
      lesson('Reliable selectors and fixtures', 'Use stable selectors and isolated test data to reduce flaky checks.'),
      lesson('Test isolation and parallel execution', 'Keep tests independent while using parallel execution safely.'),
      lesson('Reporting and CI integration', 'Publish actionable test results as part of continuous integration.'),
    ],
  },
  FAC12491: {
    lessons: [
      lesson('Applied systems problem framing', 'Translate a computing scenario into constraints, stakeholders, and measurable goals.'),
      lesson('Prototype and evaluate a solution', 'Build a small prototype and evaluate it against explicit requirements.'),
      lesson('Technical communication and review', 'Document decisions and use peer review to improve an applied solution.'),
    ],
  },
  FAC12492: {
    lessons: [
      lesson('Applied computing project planning', 'Break a practical computing project into milestones and technical risks.'),
      lesson('Integrate components and data', 'Connect components through documented interfaces and validated data flows.'),
      lesson('Evaluate and present project outcomes', 'Assess a solution against its goals and present evidence-based findings.'),
    ],
  },
  FAC09981: {
    lessons: [
      lesson('Applied software design studio', 'Explore a real-world software need and define a focused solution scope.'),
      lesson('Build a testable prototype', 'Implement a prototype with observable behavior and a small test plan.'),
      lesson('Review, refine, and demonstrate', 'Use feedback to refine a solution and communicate its limitations.'),
    ],
  },
  FAC09982: {
    lessons: [
      lesson('Applied systems integration studio', 'Plan the integration of services, data, and operational constraints.'),
      lesson('Reliability and validation', 'Test integrated behavior under expected and failure conditions.'),
      lesson('Project handoff and technical reflection', 'Prepare a maintainable handoff and reflect on trade-offs.'),
    ],
  },
};