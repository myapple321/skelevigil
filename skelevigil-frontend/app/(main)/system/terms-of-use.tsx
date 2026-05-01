import {
  LegalBody,
  LegalBullet,
  LegalDocumentLayout,
  LegalSectionTitle,
} from '@/src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENTS_LAST_UPDATED } from '@/src/legal/legalDocumentsMeta';
import { Text } from 'react-native';

export default function TermsOfUseScreen() {
  return (
    <LegalDocumentLayout title="Terms of Use" lastUpdated={LEGAL_DOCUMENTS_LAST_UPDATED}>
      <LegalBody>
        <Text style={{ fontWeight: '700' }}>SkeleVigil</Text> (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;) provides cognitive tools and neural excavation games designed to assist
        users in maintaining mental vigilance and focus. By accessing or using the{' '}
        <Text style={{ fontWeight: '700' }}>SkeleVigil</Text> application, you agree to these{' '}
        <Text style={{ fontWeight: '700' }}>Terms of Use</Text> and all applicable laws and
        regulations. You acknowledge that <Text style={{ fontWeight: '700' }}>SkeleVigil</Text> is
        a cognitive exercise tool and does not provide medical advice or diagnosis. If you do not
        agree to these terms, please discontinue use of the application.
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
