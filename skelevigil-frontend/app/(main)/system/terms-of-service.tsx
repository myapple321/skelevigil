import {
  LegalBody,
  LegalBullet,
  LegalDocumentLayout,
  LegalSectionTitle,
  LegalSubheading,
} from '@/src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENTS_LAST_UPDATED } from '@/src/legal/legalDocumentsMeta';

export default function TermsOfServiceScreen() {
  return (
    <LegalDocumentLayout title="Terms of Service" lastUpdated={LEGAL_DOCUMENTS_LAST_UPDATED}>
      <LegalSubheading>Operational Agreement</LegalSubheading>
      <LegalBody>
        By accessing the SkeleVigil interface, you agree to the following operational parameters.
      </LegalBody>

      <LegalSectionTitle>1. License to Use</LegalSectionTitle>
      <LegalBody>
        SkeleVigil grants you a personal, non-exclusive license to use the software for entertainment
        purposes. You agree not to reverse-engineer the &quot;Vigil&quot; or attempt to manipulate
        &quot;Vault&quot; credit balances through unauthorized means.
      </LegalBody>

      <LegalSectionTitle>2. Virtual Goods &amp; Purchases</LegalSectionTitle>
      <LegalBullet
        boldLead="Vault Credits: "
        rest="These are virtual items with no real-world monetary value. They are non-transferable and non-refundable."
      />
      <LegalBullet
        boldLead="One-Time Nature: "
        rest="Purchases are not subscriptions. You are charged only for the specific credit package selected."
      />
      <LegalBullet
        boldLead="Account Responsibility: "
        rest="You are responsible for securing your account. SkeleVigil cannot recover Vault Credits lost due to the deletion of an unlinked Guest Account."
      />

      <LegalSectionTitle>3. Disclaimer of Medical Efficacy</LegalSectionTitle>
      <LegalBody>
        SkeleVigil is a game. It is not a clinical tool for diagnosing or treating cognitive decline,
        memory loss, or any medical condition. Use of the app does not replace the advice of a
        healthcare professional.
      </LegalBody>
    </LegalDocumentLayout>
  );
}
