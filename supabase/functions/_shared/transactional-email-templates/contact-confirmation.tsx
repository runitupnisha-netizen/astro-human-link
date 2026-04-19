/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL =
  'https://wquzijmkiotkupygoxdf.supabase.co/storage/v1/object/public/email-assets/stellara-logo.png'

interface ContactConfirmationProps {
  name?: string
  subject?: string
  message?: string
}

const ContactConfirmationEmail = ({
  name,
  subject,
  message,
}: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — Stellara ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="64" height="64" alt="Stellara" style={logo} />
        </Section>
        <Heading style={h1}>
          {name ? `Thank you, ${name}` : 'Thank you for reaching out'}
        </Heading>
        <Text style={tagline}>Where love aligns with the stars</Text>
        <Text style={text}>
          We've received your message and our team will get back to you within
          24–48 hours. The cosmos rewards patience ✨
        </Text>
        {(subject || message) && (
          <Section style={quoteBox}>
            {subject && (
              <Text style={quoteLabel}>
                Subject: <span style={quoteValue}>{subject}</span>
              </Text>
            )}
            {message && (
              <>
                <Text style={quoteLabel}>Your message:</Text>
                <Text style={quoteText}>{message}</Text>
              </>
            )}
          </Section>
        )}
        <Text style={text}>
          In the meantime, you can explore your cosmic blueprint or browse the
          stars in your feed.
        </Text>
        <Text style={footer}>
          With cosmic love,
          <br />
          The Stellara Team
          <br />
          <Link href="https://stellaraapp.net" style={footerLink}>
            stellaraapp.net
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We received your message ✨ Stellara',
  displayName: 'Contact form confirmation',
  previewData: {
    name: 'Luna',
    subject: 'Question about my chart',
    message: 'Hi! I had a quick question about my synastry results.',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"Cormorant Garamond", Georgia, serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 32px' }
const logoSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const logo = { margin: '0 auto', borderRadius: '14px' }
const h1 = {
  fontFamily: '"Cinzel Decorative", Georgia, serif',
  fontSize: '26px',
  fontWeight: 700 as const,
  color: 'hsl(220, 35%, 7%)',
  textAlign: 'center' as const,
  margin: '0 0 8px',
  letterSpacing: '0.02em',
}
const tagline = {
  fontSize: '14px',
  fontStyle: 'italic' as const,
  color: 'hsl(270, 45%, 58%)',
  textAlign: 'center' as const,
  margin: '0 0 32px',
  letterSpacing: '0.05em',
}
const text = {
  fontSize: '16px',
  color: 'hsl(220, 20%, 30%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const quoteBox = {
  background: 'hsl(220, 30%, 97%)',
  borderLeft: '3px solid hsl(42, 75%, 62%)',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
}
const quoteLabel = {
  fontSize: '13px',
  color: 'hsl(220, 15%, 40%)',
  fontWeight: 600 as const,
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}
const quoteValue = {
  fontWeight: 400 as const,
  color: 'hsl(220, 20%, 30%)',
  textTransform: 'none' as const,
}
const quoteText = {
  fontSize: '15px',
  color: 'hsl(220, 20%, 30%)',
  lineHeight: '1.6',
  margin: '0',
  fontStyle: 'italic' as const,
}
const footer = {
  fontSize: '13px',
  color: 'hsl(220, 10%, 55%)',
  textAlign: 'center' as const,
  margin: '40px 0 0',
  lineHeight: '1.7',
}
const footerLink = { color: 'hsl(270, 45%, 58%)', textDecoration: 'none' }
