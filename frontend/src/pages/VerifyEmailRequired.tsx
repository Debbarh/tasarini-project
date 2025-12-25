import { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/integrations/api/client';
import { toast } from 'sonner';

export default function VerifyEmailRequired() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resendEmail = async () => {
    setSending(true);
    try {
      await apiClient.post('/auth/resend-verification/');
      setSent(true);
      toast.success(t('verifyEmailRequired.toast.success'));
      setTimeout(() => setSent(false), 5000);
    } catch (error: any) {
      console.error('Erreur lors du renvoi de l\'email:', error);
      toast.error(t('verifyEmailRequired.toast.error'));
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t('verifyEmailRequired.title')}
          </h1>
          <p className="text-blue-100 text-sm">
            {t('verifyEmailRequired.subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-2">
              {t('verifyEmailRequired.sentTo')}
            </p>
            <p className="text-lg font-semibold text-gray-900 bg-gray-100 px-4 py-2 rounded-lg inline-block">
              {user?.email}
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  {t('verifyEmailRequired.limitedAccess.title')}
                </p>
                <p className="text-sm text-yellow-700">
                  {t('verifyEmailRequired.limitedAccess.description')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              {t('verifyEmailRequired.steps.title')}
            </h3>
            <ol className="space-y-3 text-sm text-gray-600 ml-7">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mr-3 flex-shrink-0">
                  1
                </span>
                <span>{t('verifyEmailRequired.steps.step1')}</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mr-3 flex-shrink-0">
                  2
                </span>
                <span>{t('verifyEmailRequired.steps.step2')} <strong>{t('verifyEmailRequired.steps.step2Bold')}</strong></span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mr-3 flex-shrink-0">
                  3
                </span>
                <span>{t('verifyEmailRequired.steps.step3')}</span>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold mr-3 flex-shrink-0">
                  4
                </span>
                <span>{t('verifyEmailRequired.steps.step4')}</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 mb-3">
              <strong>{t('verifyEmailRequired.notReceived.title')}</strong>
            </p>
            <ul className="text-sm text-blue-700 space-y-1 mb-3 list-disc list-inside">
              <li>{t('verifyEmailRequired.notReceived.checkSpam')}</li>
              <li>{t('verifyEmailRequired.notReceived.checkEmail')}</li>
              <li>{t('verifyEmailRequired.notReceived.waitTime')}</li>
            </ul>
            <button
              onClick={resendEmail}
              disabled={sending || sent}
              className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all ${
                sent
                  ? 'bg-green-500 text-white'
                  : sending
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              }`}
            >
              {sent ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {t('verifyEmailRequired.buttons.sent')}
                </>
              ) : sending ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  {t('verifyEmailRequired.buttons.sending')}
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  {t('verifyEmailRequired.buttons.resend')}
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {t('verifyEmailRequired.buttons.signOut')}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-xs text-gray-500">
            {t('verifyEmailRequired.footer.validity')} <strong>{t('verifyEmailRequired.footer.hours')}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
