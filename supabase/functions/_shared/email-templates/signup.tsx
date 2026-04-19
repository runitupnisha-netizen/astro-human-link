/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO_URL =
  'https://wquzijmkiotkupygoxdf.supabase.co/storage/v1/object/public/email-assets/stellara-logo.png'

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email and step into Stellara ✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="64" height="64" alt="Stellara" style={logo} />
        </Section>
        <Heading style={h1}>Welcome to Stellara ✨</Heading>
        <Text style={tagline}>Where love aligns with the stars</Text>
        <Text style={text}>
          Thanks for joining us. The cosmos has been waiting for you.
        </Text>
        <Text style={text}>
          Please confirm{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>{' '}
          to begin your journey:
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirm Your Email
          </Button>
        </Section>
        <Text style={text}>
          Once verified, you'll unlock your personalized cosmic blueprint and
          start discovering aligned souls.
        </Text>
        <Text style={footer}>
          If you didn't create a Stellara account, you can safely ignore this email.
          <br />
          Need help? Contact us at{' '}
          <Link href="mailto:info@stellaraapp.net" style={footerLink}>
            info@stellaraapp.net
          </Link>
          <br />
          <Link href={siteUrl} style={footerLink}>
            stellaraapp.net
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
}
const link = { color: 'hsl(270, 45%, 58%)', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = {
  background: 'linear-gradient(45deg, hsl(42, 75%, 62%), hsl(35, 70%, 55%))',
  color: 'hsl(220, 35%, 7%)',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.03em',
}
const footer = {
  fontSize: '12px',
  color: 'hsl(220, 10%, 55%)',
  textAlign: 'center' as const,
  margin: '40px 0 0',
  lineHeight: '1.6',
}
const footerLink = { color: 'hsl(270, 45%, 58%)', textDecoration: 'none' }
