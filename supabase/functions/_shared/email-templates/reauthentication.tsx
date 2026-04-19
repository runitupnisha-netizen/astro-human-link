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

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL =
  'https://wquzijmkiotkupygoxdf.supabase.co/storage/v1/object/public/email-assets/stellara-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Stellara verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="64" height="64" alt="Stellara" style={logo} />
        </Section>
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={tagline}>Where love aligns with the stars</Text>
        <Text style={text}>Use the code below to confirm it's you:</Text>
        <Section style={codeSection}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          This code expires shortly. If you didn't request this, you can safely
          ignore this email.
          <br />
          <Link href="https://stellaraapp.net" style={footerLink}>
            stellaraapp.net
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
  fontSize: '28px',
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
  textAlign: 'center' as const,
}
const codeSection = { textAlign: 'center' as const, margin: '32px 0' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: 'hsl(270, 45%, 58%)',
  letterSpacing: '0.4em',
  background: 'hsl(45, 30%, 96%)',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: 0,
  display: 'inline-block',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 55%)',
  textAlign: 'center' as const,
  margin: '40px 0 0',
  lineHeight: '1.6',
}
const footerLink = { color: 'hsl(270, 45%, 58%)', textDecoration: 'none' }
