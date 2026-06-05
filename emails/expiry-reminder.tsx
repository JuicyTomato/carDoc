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
  Row,
  Column,
} from '@react-email/components'

export interface ExpiryItem {
  vehicleName: string
  documentType: string
  documentTitle: string
  expiryDate: string
  daysUntilExpiry: number
  appUrl: string
}

interface ExpiryReminderProps {
  userName: string
  items: ExpiryItem[]
  settingsUrl: string
}

function urgencyColor(days: number): string {
  if (days <= 1) return '#dc2626'
  if (days <= 7) return '#d97706'
  return '#2563eb'
}

function urgencyLabel(days: number): string {
  if (days === 0) return 'Oggi'
  if (days === 1) return '1 giorno'
  return `${days} giorni`
}

export default function ExpiryReminder({ userName, items, settingsUrl }: ExpiryReminderProps) {
  const count = items.length
  const previewText =
    count === 1
      ? `Scadenza ${items[0].documentType} — ${items[0].vehicleName}: ${urgencyLabel(items[0].daysUntilExpiry)}`
      : `${count} documenti in scadenza — carDoc`

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

          {/* Intro */}
          <Section style={contentStyle}>
            <Text style={textStyle}>Ciao {userName},</Text>
            <Text style={textStyle}>
              {count === 1
                ? 'hai un documento in scadenza che richiede la tua attenzione:'
                : `hai ${count} documenti in scadenza che richiedono la tua attenzione:`}
            </Text>
          </Section>

          {/* Document list */}
          {items.map((item, i) => {
            const color = urgencyColor(item.daysUntilExpiry)
            return (
              <Section key={i} style={itemContainerStyle}>
                <Row>
                  <Column style={itemLeftStyle}>
                    <Text style={itemVehicleStyle}>{item.vehicleName}</Text>
                    <Text style={itemTitleStyle}>
                      {item.documentType} — {item.documentTitle}
                    </Text>
                    <Text style={{ ...itemDateStyle, color }}>
                      Scade il {item.expiryDate} ({urgencyLabel(item.daysUntilExpiry)})
                    </Text>
                  </Column>
                  <Column style={itemRightStyle}>
                    <Button href={item.appUrl} style={{ ...itemButtonStyle, backgroundColor: color }}>
                      Apri
                    </Button>
                  </Column>
                </Row>
              </Section>
            )
          })}

          <Hr style={hrStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Hai ricevuto questa email perché hai attivato le notifiche di scadenza su carDoc.
              Puoi modificare le preferenze nelle{' '}
              <a href={settingsUrl} style={linkStyle}>impostazioni</a>.
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
  padding: '24px 32px 8px',
}
const textStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 12px',
}
const itemContainerStyle: React.CSSProperties = {
  margin: '0 24px 4px',
  padding: '14px 16px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
}
const itemLeftStyle: React.CSSProperties = {
  verticalAlign: 'middle',
}
const itemRightStyle: React.CSSProperties = {
  verticalAlign: 'middle',
  textAlign: 'right',
  width: '60px',
}
const itemVehicleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 2px',
  fontWeight: 500,
}
const itemTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#111827',
  margin: '0 0 4px',
}
const itemDateStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  margin: 0,
}
const itemButtonStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 600,
  textDecoration: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  display: 'inline-block',
}
const hrStyle: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '20px 32px 0',
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
