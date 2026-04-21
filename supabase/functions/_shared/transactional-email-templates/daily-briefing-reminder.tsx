/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BriefingReminderProps {
  displayName?: string
  energyTheme?: string
  mood?: string
  appUrl?: string
  unsubscribeUrl?: string
}

export const DailyBriefingReminderEmail = ({
  displayName = 'Friend',
  energyTheme = 'A new cosmic chapter awaits',
  mood = 'Reflective',
  appUrl = 'https://astro-human-link.lovable.app/briefing',
  unsubscribeUrl = '#',
}: BriefingReminderProps) => (
  <Html>
    <Head />
    <Preview>{`Your Daily Cosmic Briefing — ${energyTheme}`}</Preview>
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
      <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }}>
        <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Text style={{ fontSize: '12px', letterSpacing: '4px', color: '#b08a3e', textTransform: 'uppercase', margin: 0 }}>
            Stellara
          </Text>
          <Heading style={{ fontSize: '28px', color: '#0f172a', marginTop: '12px', marginBottom: '8px' }}>
            Good morning, {displayName} ✨
          </Heading>
          <Text style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Your Daily Cosmic Briefing is ready
          </Text>
        </Section>

        <Section style={{ background: '#fafaf7', border: '1px solid #ece6d6', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <Text style={{ fontSize: '11px', color: '#b08a3e', letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
            Today's energy
          </Text>
          <Text style={{ fontSize: '18px', color: '#0f172a', marginTop: '8px', marginBottom: '12px', fontWeight: 600 }}>
            {energyTheme}
          </Text>
          <Text style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
            Mood: <strong style={{ color: '#0f172a' }}>{mood}</strong>
          </Text>
        </Section>

        <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Button
            href={appUrl}
            style={{
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Open today's briefing
          </Button>
        </Section>

        <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '32px', lineHeight: '18px' }}>
          You're receiving this because you turned on Daily Briefing reminders in Stellara.
          <br />
          <Link href={unsubscribeUrl} style={{ color: '#94a3b8', textDecoration: 'underline' }}>
            Unsubscribe
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: DailyBriefingReminderEmail,
  subject: (data) => `🌅 Your Daily Cosmic Briefing — ${data?.energyTheme ?? 'today\'s energy is ready'}`,
  displayName: 'Daily Cosmic Briefing reminder',
  previewData: {
    displayName: 'Aurora',
    energyTheme: 'Magnetic clarity',
    mood: 'Open-hearted',
  },
}
