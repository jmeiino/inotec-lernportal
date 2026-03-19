import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 0,
  },
  headerBar: {
    backgroundColor: "#009EE3",
    height: 60,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  headerSubText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: 12,
    opacity: 0.9,
  },
  border: {
    margin: 30,
    marginTop: 20,
    padding: 40,
    paddingTop: 30,
    borderWidth: 2,
    borderColor: "#009EE3",
    borderStyle: "solid",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  innerBorder: {
    borderWidth: 1,
    borderColor: "#B0D4E8",
    borderStyle: "solid",
    padding: 30,
    width: "100%",
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  companyName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#009EE3",
    letterSpacing: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 30,
    letterSpacing: 2,
  },
  preText: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  participantName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222222",
    marginBottom: 20,
    textAlign: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#009EE3",
    borderBottomStyle: "solid",
    paddingHorizontal: 40,
  },
  trackLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 6,
  },
  trackName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#009EE3",
    marginBottom: 20,
    textAlign: "center",
  },
  completionText: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 30,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderTopStyle: "solid",
  },
  detailLabel: {
    fontSize: 10,
    color: "#999999",
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 11,
    color: "#444444",
    fontWeight: "bold",
  },
  footer: {
    backgroundColor: "#F8F9FA",
    height: 40,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#888888",
  },
})

interface CertificatePDFProps {
  participantName: string
  trackName: string
  certNumber: string
  issuedAt: Date
}

export function CertificatePDF({
  participantName,
  trackName,
  certNumber,
  issuedAt,
}: CertificatePDFProps) {
  const dateStr = new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(issuedAt)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>INOTEC</Text>
          <Text style={styles.headerSubText}>Sicherheitstechnik GmbH</Text>
        </View>

        {/* Main Content with decorative border */}
        <View style={styles.border}>
          <View style={styles.innerBorder}>
            <Text style={styles.companyName}>INOTEC</Text>
            <Text style={styles.title}>Zertifikat</Text>

            <Text style={styles.preText}>
              Hiermit wird bestatigt, dass
            </Text>

            <Text style={styles.participantName}>{participantName}</Text>

            <Text style={styles.trackLabel}>den Lernpfad</Text>

            <Text style={styles.trackName}>{trackName}</Text>

            <Text style={styles.completionText}>
              erfolgreich abgeschlossen hat.
            </Text>

            {/* Details Row */}
            <View style={styles.detailsRow}>
              <View>
                <Text style={styles.detailLabel}>Ausgestellt am</Text>
                <Text style={styles.detailValue}>{dateStr}</Text>
              </View>
              <View>
                <Text style={styles.detailLabel}>Zertifikatsnr.</Text>
                <Text style={styles.detailValue}>{certNumber}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            INOTEC Sicherheitstechnik GmbH
          </Text>
        </View>
      </Page>
    </Document>
  )
}
