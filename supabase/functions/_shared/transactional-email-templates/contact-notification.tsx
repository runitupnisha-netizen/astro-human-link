/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ContactNotificationProps {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const ContactNotificationEmail = ({
  name,
  email,
  subject,
  message,
}: ContactNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New contact form submission{name ? ` from ${name}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📬 New Contact Form Submission</Heading>
        <Text style={meta}>A new message arrived from the Stellara contact form.</Text>
        <Hr style={hr} />
        <Section>
          <Text style={label}>From</Text>
          <Text style={value}>
            {name || 'Anonymous'}{' '}
            {email && (
              <Link href={`mailto:${email}`} style={link}>
                &lt;{email}&gt;
              </Link>
            )}
          </Text>
          {subject && (
            <>
              <Text style={label}>Subject</Text>
              <Text style={value}>{subject}</Text>
            </>
          )}
          <Text style={label}>Message</Text>
          <Section style={messageBox}>
            <Text style={messageText}>{message || '(no message)'}</Text>
          </Section>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          {email && (
            <Link href={`mailto:${email}`} style={replyLink}>
              Reply to {name || email}
            </Link>
          )}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) =>
    `[Stellara Contact] ${data?.subject || 'New message'}${data?.name ? ` from ${data.name}` : ''}`,
  to: 'stellaradating@gmail.com',
  displayName: 'Contact form notification (admin)',
  previewData: {
    name: 'Luna Starborn',
    email: 'luna@example.com',
    subject: 'Question about my chart',
    message: 'Hi! I had a quick question about my synastry results.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 600 as const,
  color: 'hsl(220, 35%, 7%)',
  margin: '0 0 8px',
}
const meta = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 50%)',
  margin: '0 0 16px',
}
const hr = {
  border: 'none',
  borderTop: '1px solid hsl(220, 15%, 90%)',
  margin: '20px 0',
}
const label = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 50%)',
  fontWeight: 600 as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '16px 0 4px',
}
const value = {
  fontSize: '15px',
  color: 'hsl(220, 25%, 15%)',
  margin: '0 0 4px',
  lineHeight: '1.5',
}
const link = { color: 'hsl(270, 45%, 50%)', textDecoration: 'none' }
const messageBox = {
  background: 'hsl(220, 30%, 97%)',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '6px 0 0',
}
const messageText = {
  fontSize: '15px',
  color: 'hsl(220, 25%, 15%)',
  lineHeight: '1.6',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}
const footer = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 50%)',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}
const replyLink = {
  color: 'hsl(270, 45%, 50%)',
  textDecoration: 'none',
  fontWeight: 600 as const,
}
