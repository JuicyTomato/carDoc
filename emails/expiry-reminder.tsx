import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
  Section,
} from '@react-email/components'

interface ExpiryReminderProps {
  userName: string
  vehicleName: string // e.g. "Ducati Monster 2021"
  documentType: string // e.g. "Assicurazione"
  documentTitle: string
  expiryDate: string // formatted date string
  daysUntilExpiry: number
  appUrl: string
}

export default function ExpiryReminder({
  userName,
  vehicleName,
  documentType,
  documentTitle,
  expiryDate,
  daysUntilExpiry,
  appUrl,
}: ExpiryReminderProps) {
  const urgencyColor =
    daysUntilExpiry <= 1
      ? '#dc2626' // red-600
      : daysUntilExpiry <= 7
        ? '#d97706' // amber-600
        : '#2563eb' // blue-600

  const giorni = daysUntilExpiry === 1 ? 'giorno' : 'giorni'
  const previewText = `Scadenza ${documentType} - ${vehicleName}: ${daysUntilExpiry} ${giorni} rimanenti`

  return (
    <Html lang="it">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={logoStyle}>carDoc</Heading>
          </Section>

          {/* Main content */}
          <Section style={contentStyle}>
            <Heading as="h1" style={titleStyle}>
              Scadenza {documentType} - {vehicleName}
            </Heading>

            <Text style={textStyle}>Ciao {userName},</Text>

            <Text style={textStyle}>
              il documento <strong>{documentTitle}</strong> per il veicolo{' '}
              <strong>{vehicleName}</strong> scade il{' '}
              <strong style={{ color: urgencyColor }}>{expiryDate}</strong>.
            </Text>

            {/* Urgency badge */}
            <Section style={badgeContainerStyle}>
              <Text style={{ ...badgeStyle, backgroundColor: urgencyColor }}>
                {String(daysUntilExpiry)} {giorni} rimanenti
              </Text>
            </Section>

            <Text style={textStyle}>
              Ti consigliamo di rinnovare il documento prima della scadenza per
              evitare interruzioni nella copertura del tuo veicolo.
            </Text>

            {/* CTA */}
            <Section style={ctaContainerStyle}>
              <Button href={appUrl} style={buttonStyle}>
                Visualizza documento
              </Button>
            </Section>
          </Section>

          <Hr style={hrStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Hai ricevuto questa email perché hai attivato le notifiche di
              scadenza su carDoc. Puoi modificare le tue preferenze nelle{' '}
              <a href={`${appUrl}/settings`} style={linkStyle}>
                impostazioni
              </a>
              .
            </Text>
            <Text style={footerTextStyle}>
              © {new Date().getFullYear()} carDoc — Gestione documenti veicoli
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const containerStyle: React.CSSProperties = {
  maxWidth: '580px',
  margin: '40px auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}

const headerStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  padding: '24px 32px',
}

const logoStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '-0.5px',
}

const contentStyle: React.CSSProperties = {
  padding: '32px 32px 24px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#111827',
  marginTop: 0,
  marginBottom: '16px',
}

const textStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
}

const badgeContainerStyle: React.CSSProperties = {
  margin: '16px 0',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '6px 14px',
  borderRadius: '20px',
  margin: 0,
}

const ctaContainerStyle: React.CSSProperties = {
  margin: '24px 0 8px',
  textAlign: 'center',
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  borderRadius: '6px',
  padding: '12px 28px',
  display: 'inline-block',
}

const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 32px',
}

const footerStyle: React.CSSProperties = {
  padding: '16px 32px 24px',
}

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#9ca3af',
  margin: '0 0 8px',
}

const linkStyle: React.CSSProperties = {
  color: '#6b7280',
}
