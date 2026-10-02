export const policies: Record<
  string,
  { title: string; sections: { title: string; text: string }[] }
> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        title: 'Information used by this workspace',
        text: 'This application stores account details, company records, assignments, internal messages, attachments, time entries, and audit events entered by authorized users. Your company determines why this information is used and who may access it.',
      },
      {
        title: 'Purpose and access',
        text: 'Information supports client management, service delivery, teamwork, authentication, and security. Access is restricted by company and role. Authorized workspace administrators manage membership and account access.',
      },
      {
        title: 'Retention and requests',
        text: 'Production retention periods, controller identity, contact details, hosting locations, subprocessors, legal bases, and rights-request procedures must be documented by the deploying company before real personal data is collected. Contact your workspace administrator about access, correction, export, and deletion.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      {
        title: 'Authorized business use',
        text: 'Access is intended for invited members of a business workspace. Keep credentials private, provide accurate information, and use the workspace only within your assigned permissions.',
      },
      {
        title: 'Your content and responsibilities',
        text: 'Your organization remains responsible for the business records and content it enters, the rights to use that content, and its internal access decisions. Do not upload unlawful content or attempt to access another organization’s records.',
      },
      {
        title: 'Commercial terms pending',
        text: 'Service provider identity, governing law, support commitments, liability terms, subscription pricing, renewal, termination, and dispute procedures require company-specific legal review. This draft is not a production service agreement.',
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    sections: [
      {
        title: 'Essential authentication cookies',
        text: 'NextAuth uses session, CSRF, and callback cookies to sign you in, protect authentication requests, and return you to the application. Session cookies are HTTP-only and secure when deployed over HTTPS.',
      },
      {
        title: 'Local browser storage',
        text: 'Relay stores theme and cookie-preference choices locally in your browser. These values personalize the interface and do not contain business records or passwords.',
      },
      {
        title: 'Optional tracking',
        text: 'No analytics, advertising, or marketing trackers are installed in this application. If optional tracking is added, its purposes, providers, retention, and consent controls must be configured before activation.',
      },
    ],
  },
  security: {
    title: 'Security Policy',
    sections: [
      {
        title: 'Application controls',
        text: 'The application uses password hashing, authenticated sessions, server-side authorization, company-scoped database queries, input validation, login throttling, and audit records for sensitive changes.',
      },
      {
        title: 'Deployment responsibilities',
        text: 'Production operators must configure HTTPS, secret management, database backups, least-privilege database access, monitoring, patch management, email delivery, attachment scanning, and incident response. Development credentials must be replaced.',
      },
      {
        title: 'No certification claims',
        text: 'This implementation does not claim independent security certification, a completed penetration test, or compliance with any particular regulatory framework.',
      },
    ],
  },
  disclosure: {
    title: 'Responsible Disclosure',
    sections: [
      {
        title: 'Report privately',
        text: 'Report suspected security issues to your company’s designated security contact. A production reporting address must be published by the operator before launch. Do not include unnecessary personal or confidential data in a report.',
      },
      {
        title: 'Research boundaries',
        text: 'Do not access other users’ information, disrupt the service, or conduct destructive tests. Use a test environment under written authorization. Provide reproduction steps, affected pages, and the potential impact.',
      },
    ],
  },
  accessibility: {
    title: 'Accessibility Statement',
    sections: [
      {
        title: 'Design approach',
        text: 'Relay aims to support keyboard navigation, visible focus indicators, labeled form controls, responsive layouts, readable contrast, and reduced-motion preferences. Board stages can be changed with selects as an alternative to dragging.',
      },
      {
        title: 'Known review requirements',
        text: 'A complete independent assistive-technology and WCAG conformance audit has not been completed. Charts are accompanied by reports and tables. Report access barriers to your workspace administrator, including the browser and assistive technology used.',
      },
    ],
  },
  dpa: {
    title: 'Data Processing Agreement',
    sections: [
      {
        title: 'Agreement template',
        text: 'The deploying company must identify controller and processor roles, processing instructions, data subjects, personal-data categories, processing duration, and the purpose of processing.',
      },
      {
        title: 'Terms requiring completion',
        text: 'Confidentiality, security measures, subprocessors, international transfers, assistance with rights requests, breach notices, audits, and return or deletion of data require negotiated and legally reviewed terms. This page does not constitute an executed agreement.',
      },
    ],
  },
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    sections: [
      {
        title: 'Protect your workspace',
        text: 'Do not share credentials, bypass role restrictions, access another company’s information, upload malicious files, overload the service, or use internal messaging to harass others.',
      },
      {
        title: 'Appropriate business records',
        text: 'Only enter information needed for legitimate work and for which your organization has authority. Do not place passwords, private keys, or payment-card information into notes, comments, messages, or attachments.',
      },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    sections: [
      {
        title: 'Demonstration data',
        text: 'Seeded accounts, companies, client records, sales values, and performance metrics are fictional demonstration data. They are not evidence of real commercial activity, revenue, or results.',
      },
      {
        title: 'Policy and reporting limitations',
        text: 'Policy text is an implementation draft requiring company-specific review. Reports reflect recorded data and depend on its accuracy and completeness. Billing concepts do not represent an active payment service.',
      },
    ],
  },
};
