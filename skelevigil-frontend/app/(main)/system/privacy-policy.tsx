import {
  LegalBody,
  LegalBullet,
  LegalDocumentLayout,
  LegalSectionTitle,
  LegalSimpleBullet,
  LegalSubheading,
} from '@/src/components/LegalDocumentLayout';
import { LEGAL_DOCUMENTS_LAST_UPDATED } from '@/src/legal/legalDocumentsMeta';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentLayout title="Privacy Policy" lastUpdated={LEGAL_DOCUMENTS_LAST_UPDATED}>
      <LegalSubheading>Identity Protection Protocol</LegalSubheading>
      <LegalBody>
        SkeleVigil is built on a &quot;Privacy by Design&quot; foundation. We prioritize the security of
        your neural data (app progress) and personal identifiers.
      </LegalBody>

      <LegalSectionTitle>1. Data Collection</LegalSectionTitle>
      <LegalBullet
        boldLead="Account Information: "
        rest="When you link a Google, Apple, or Email account, we store your unique User ID and Email to synchronize your Vault progress across devices."
      />
      <LegalBullet
        boldLead="Mission Data: "
        rest='We track your "Mission Reserves," "Successful Missions," and "Lifetime Totals" to ensure your game state is accurate.'
      />
      <LegalBullet
        boldLead="Guest Mode: "
        rest="For unlinked accounts, all data remains local to your device and is not transmitted to our servers."
      />

      <LegalSectionTitle>2. Data Usage</LegalSectionTitle>
      <LegalBody>We do not sell, trade, or rent your personal information. Your data is used exclusively to:</LegalBody>
      <LegalSimpleBullet>
        Maintain your Vault balances and Mission progress.
      </LegalSimpleBullet>
      <LegalSimpleBullet>
        Process one-time purchases via the App Store/Google Play (handled securely by RevenueCat).
      </LegalSimpleBullet>
      <LegalSimpleBullet>
        Deliver authorized &quot;Mission Alerts&quot; and &quot;Monthly Gifts&quot; if enabled.
      </LegalSimpleBullet>
    </LegalDocumentLayout>
  );
}
