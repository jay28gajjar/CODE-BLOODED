import { EmailAnalysis, WebmailPlatform, URGENCY_KEYWORDS, CREDENTIAL_REQUEST_KEYWORDS } from '../types/webpage';

export class EmailDetector {
  private platform: WebmailPlatform = 'none';
  private observer!: MutationObserver;

  init(): void {
    this.platform = this.detectPlatform();
    if (this.platform !== 'none') {
      this.observer = new MutationObserver(() => this.handleMutation());
      this.observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  destroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  detectPlatform(): WebmailPlatform {
    const host = window.location.hostname;
    if (host.includes('mail.google.com')) return 'gmail';
    if (host.includes('outlook.live.com') || host.includes('outlook.office.com') || host.includes('outlook.office365.com')) return 'outlook';
    if (host.includes('mail.yahoo.com')) return 'yahoo';
    if (host.includes('mail.proton.me')) return 'protonmail';
    return 'none';
  }

  private handleMutation(): void {
    if (this.platform !== 'none') {
        const result = this.analyzeCurrentEmail();
        if (result) {
            chrome.runtime.sendMessage({ type: 'ANALYZE_EMAIL', payload: result });
        }
    }
  }

  analyzeCurrentEmail(): EmailAnalysis | null {
    switch (this.platform) {
      case 'gmail': return this.analyzeGmail();
      case 'outlook': return this.analyzeOutlook();
      case 'yahoo': return this.analyzeYahoo();
      default: return null;
    }
  }

  private analyzeGmail(): EmailAnalysis | null {
    const senderEl = document.querySelector('.gD');
    const subjectEl = document.querySelector('.hP');
    const bodyEl = document.querySelector('.a3s.aiL') || document.querySelector('.ii.gt');
    
    if (!senderEl || !bodyEl) return null;

    const displayName = senderEl.getAttribute('name') || senderEl.textContent || '';
    const emailAddress = senderEl.getAttribute('email') || '';
    const subject = subjectEl?.textContent || '';
    const bodyText = bodyEl.textContent || '';
    
    return {
      platform: 'gmail',
      sender: emailAddress,
      displayName,
      replyTo: null, 
      subject,
      hasDisplayNameMismatch: this.checkDisplayNameMismatch(displayName, emailAddress),
      hasDomainMismatch: false,
      hasUrgencyLanguage: this.detectUrgencyLanguage(bodyText),
      hasCredentialRequest: this.detectCredentialRequest(bodyText),
      hasPaymentRequest: this.detectPaymentRequest(bodyText),
      hasThreatLanguage: this.detectThreatLanguage(bodyText),
      hasSuspiciousAttachment: false,
      links: this.extractLinksFromEmail(bodyEl),
      indicators: [],
      score: 0
    };
  }

  private analyzeOutlook(): EmailAnalysis | null {
    return null;
  }

  private analyzeYahoo(): EmailAnalysis | null {
    return null;
  }

  private extractLinksFromEmail(emailBody: Element): string[] {
    const links: string[] = [];
    const anchors = emailBody.querySelectorAll('a[href]');
    anchors.forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('http')) {
        const img = a.querySelector('img');
        if (!img || img.width > 1 || img.height > 1) {
          links.push(href);
        }
      }
    });
    return links;
  }

  private checkDisplayNameMismatch(displayName: string, emailAddress: string): boolean {
    if (!displayName || displayName === emailAddress) return false;
    return displayName.includes('@') && displayName !== emailAddress;
  }

  private checkDomainMismatch(fromEmail: string, replyTo: string | null): boolean {
    if (!replyTo) return false;
    const fromDomain = fromEmail.split('@')[1];
    const replyDomain = replyTo.split('@')[1];
    return fromDomain !== replyDomain;
  }

  private detectUrgencyLanguage(text: string): boolean {
    const lower = text.toLowerCase();
    return URGENCY_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }

  private detectCredentialRequest(text: string): boolean {
    const lower = text.toLowerCase();
    return CREDENTIAL_REQUEST_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  }

  private detectPaymentRequest(text: string): boolean {
    const lower = text.toLowerCase();
    return ['invoice', 'payment', 'wire transfer', 'gift card', 'bitcoin'].some(kw => lower.includes(kw));
  }

  private detectThreatLanguage(text: string): boolean {
    const lower = text.toLowerCase();
    return ['suspend', 'terminate', 'close your account', 'legal action'].some(kw => lower.includes(kw));
  }
}
