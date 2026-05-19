/**
 * Seeds the roles collection with built-in role presets.
 * Safe to call on every startup — checks for existence before inserting.
 */

import 'dotenv/config'
import { connectDb, getDb } from '../src/db/index.js'

const DEFAULTS = [
  // ── Engineering ───────────────────────────────────────────────────────────
  {
    name: 'Application Developer',
    description: 'Building web apps, APIs, and services across the full stack.',
    category: 'Engineering',
    context: 'I am a software application developer with experience building web and mobile applications, REST APIs, and microservices. I work with modern frameworks and focus on writing clean, maintainable, well-tested code. I am familiar with relational and NoSQL databases, cloud deployments, and CI/CD pipelines.',
    skills: ['JavaScript', 'Python', 'REST APIs', 'Databases', 'Cloud'],
    isDefault: true,
  },
  {
    name: 'Database Administrator',
    description: 'Designing, maintaining, and optimizing database systems.',
    category: 'Engineering',
    context: 'I am a database administrator responsible for designing, maintaining, and optimizing relational and NoSQL database systems. I handle schema design, query performance tuning, indexing strategies, backup and recovery, and data integrity. I work with databases such as PostgreSQL, MySQL, SQL Server, and MongoDB.',
    skills: ['PostgreSQL', 'MySQL', 'SQL Server', 'MongoDB', 'Query Optimization'],
    isDefault: true,
  },
  {
    name: 'DevOps / Platform Engineer',
    description: 'CI/CD pipelines, cloud infrastructure, and container platforms.',
    category: 'Engineering',
    context: 'I am a DevOps and platform engineer responsible for designing and maintaining CI/CD pipelines, cloud infrastructure, container orchestration, and developer tooling. I work with Kubernetes, Terraform, Docker, and cloud providers (AWS, Azure, GCP) to deliver reliable, secure, and scalable platform services.',
    skills: ['Kubernetes', 'Terraform', 'Docker', 'AWS', 'CI/CD'],
    isDefault: true,
  },
  {
    name: 'Security Engineer',
    description: 'Application security, cloud security, and compliance.',
    category: 'Engineering',
    context: 'I am a security engineer focused on application security, cloud security, and regulatory compliance. I conduct code reviews for vulnerabilities, implement security controls, perform threat modeling, and ensure systems comply with frameworks such as SOC 2, ISO 27001, and OWASP. I think in terms of attack surfaces and defense-in-depth.',
    skills: ['OWASP', 'Threat Modeling', 'Cloud Security', 'Penetration Testing', 'Compliance'],
    isDefault: true,
  },
  {
    name: 'QA / Test Engineer',
    description: 'Test strategy, automation frameworks, and quality assurance.',
    category: 'Engineering',
    context: 'I am a QA and test engineer responsible for ensuring software quality through both manual and automated testing. I design test strategies, write test cases, build automation frameworks, and collaborate with developers to identify and resolve defects early. I work with tools like Selenium, Cypress, Jest, Playwright, and Postman.',
    skills: ['Selenium', 'Cypress', 'Jest', 'Test Strategy', 'API Testing'],
    isDefault: true,
  },
  {
    name: 'Data Scientist / ML Engineer',
    description: 'Machine learning models, data pipelines, and analytics.',
    category: 'Engineering',
    context: 'I am a data scientist and machine learning engineer who builds predictive models, analyzes large datasets, and develops data pipelines. I work with Python, SQL, and ML frameworks such as PyTorch and scikit-learn to extract insights and deploy intelligent features. I focus on model accuracy, interpretability, and production reliability.',
    skills: ['Python', 'PyTorch', 'scikit-learn', 'SQL', 'Data Pipelines'],
    isDefault: true,
  },
  // ── Architecture ─────────────────────────────────────────────────────────
  {
    name: 'Solutions Architect',
    description: 'Designing end-to-end technical solutions for enterprise needs.',
    category: 'Architecture',
    context: 'I am a solutions architect who designs end-to-end technical solutions for enterprise requirements. I analyze business needs, evaluate technology options, create architecture diagrams, and ensure solutions are scalable, secure, and cost-effective. I work across cloud platforms, integration patterns, and application architectures.',
    skills: ['System Design', 'Cloud Architecture', 'Integration Patterns', 'AWS', 'Azure'],
    isDefault: true,
  },
  {
    name: 'Enterprise Architect',
    description: 'Technology strategy, architecture governance, and standards.',
    category: 'Architecture',
    context: 'I am an enterprise architect responsible for defining the overall technology strategy and architecture standards across an organization. I evaluate technology investments, establish architectural principles, govern technical decisions, and align IT capabilities with business strategy. I work at the intersection of business and technology leadership.',
    skills: ['Enterprise Architecture', 'TOGAF', 'Technology Strategy', 'Governance', 'Roadmapping'],
    isDefault: true,
  },
  {
    name: 'Cloud Engineer',
    description: 'Cloud infrastructure design, cost optimization, and reliability.',
    category: 'Architecture',
    context: 'I am a cloud engineer who designs and manages cloud infrastructure across AWS, Azure, or GCP. I focus on cost optimization, reliability, security, and scalability of cloud-native services. I work with infrastructure-as-code tools, serverless architectures, and container platforms to build production-grade environments.',
    skills: ['AWS', 'Azure', 'GCP', 'Terraform', 'Serverless'],
    isDefault: true,
  },
  // ── Business & GTM ────────────────────────────────────────────────────────
  {
    name: 'Technical Sales',
    description: 'Demos, POCs, and bridging technology to business value.',
    category: 'Business',
    context: 'I am a technical sales professional who bridges the gap between technical solutions and business value. I conduct product demonstrations, build proof-of-concept implementations, answer technical questions during sales cycles, and help customers understand how technology solves their specific business problems. I need to be accurate yet accessible.',
    skills: ['Solution Selling', 'POC Development', 'Customer Discovery', 'Demos', 'RFP Responses'],
    isDefault: true,
  },
  {
    name: 'Product Manager',
    description: 'Product strategy, requirements, and cross-functional alignment.',
    category: 'Business',
    context: 'I am a technical product manager responsible for defining product strategy, writing requirements, and aligning engineering, design, and business stakeholders. I translate customer needs into technical specifications, manage the product roadmap, and measure outcomes through data-driven metrics. I need clarity and precision in all communications.',
    skills: ['Product Strategy', 'User Stories', 'Roadmapping', 'Stakeholder Alignment', 'Metrics'],
    isDefault: true,
  },
  {
    name: 'Technical Writer',
    description: 'Documentation, API references, and developer guides.',
    category: 'Business',
    context: 'I am a technical writer who creates clear, accurate documentation for software products and APIs. I write developer guides, API references, user manuals, architecture overviews, and release notes. I bridge the gap between engineering teams and end users, ensuring all documentation is accurate, well-structured, and easy to navigate.',
    skills: ['API Documentation', 'Developer Guides', 'Markdown', 'OpenAPI', 'Docs-as-Code'],
    isDefault: true,
  },
]

export async function seedRoles() {
  const col = getDb().collection('roles')
  let seeded = 0

  for (const role of DEFAULTS) {
    const existing = await col.findOne({ name: role.name, isDefault: true })
    if (!existing) {
      await col.insertOne(role)
      seeded++
    }
  }

  if (seeded > 0) console.log(`[seed] Seeded ${seeded} default role(s)`)
}

// Allow running directly: node seeds/roles.js
if (process.argv[1].endsWith('roles.js')) {
  connectDb()
    .then(seedRoles)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1) })
}
