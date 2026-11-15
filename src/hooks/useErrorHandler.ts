// ========================================
// FILE: src/hooks/useErrorHandler.ts
// ========================================
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { AppError, isAppError } from '@/lib/errors/AppError';
import { extractAppError } from '@/helpers/error-helpers';

/**
 * Hook para tratamento consistente de erros com Sonner
 * Otimizado para trabalhar com erros do Electron IPC
 */
export function useErrorHandler() {
  const { t, i18n } = useTranslation();

  /**
   * Trata erros vindos do IPC ou da aplicação
   * @param error - Erro capturado
   * @param fallbackKey - Chave i18n de fallback
   * @returns O AppError extraído ou null
   */
  const handleError = (error: unknown, fallbackKey?: string): AppError | null => {
    // Tenta extrair AppError do erro IPC
    const appError = extractAppError(error);
    
    if (appError) {
      // Erro estruturado - usa o tipo para escolher o toast correto
      const i18nPlaceholders = appError.data?.i18n || {};
      const message = t(appError.i18nKey, i18nPlaceholders) as string;
      
      // Extrai duração se existir (em ms)
      const duration = appError.data?.duration;
      const options = duration ? { duration } : undefined;
      
      switch (appError.type) {
        case 'success':
          toast.success(message, options);
          break;
        case 'warning':
          toast.warning(message, options);
          break;
        case 'info':
          toast.info(message, options);
          break;
        case 'error':
          toast.error(message, options);
          break;
        default:
          toast(message, options);
          break;
      }
      
      return appError;
    }

    // Erro genérico - usa fallback
    const message = error instanceof Error ? error.message : String(error);

    // Muitas regras do processo principal lançam só a chave de tradução
    // (ex. `new Error('maintenances:errors.vehicleOnTrip')`). Pelo IPC chega
    // como "Error invoking remote method '...': Error: <chave>" e caía sempre
    // no erro genérico de recurso — o utilizador via "Erro ao..." sem saber
    // porquê. Se a mensagem trouxer uma chave que existe, mostra-a.
    const keyMatch = message.match(/([a-z][\w-]*:[a-zA-Z][\w.]*)\s*$/);
    if (keyMatch && i18n.exists(keyMatch[1])) {
      toast.error(t(keyMatch[1]) as string);
      return null;
    }

    const displayMessage = (fallbackKey ? t(fallbackKey) : message) as string;
    toast.error(displayMessage);
    
    return null;
  };

  /**
   * Exibe toast de sucesso
   */
  const showSuccess = (i18nKey: string, placeholders?: Record<string, any>, duration?: number) => {
    toast.success(t(i18nKey, placeholders) as string, duration ? { duration } : undefined);
  };

  /**
   * Exibe toast de erro
   */
  const showError = (i18nKey: string, placeholders?: Record<string, any>, duration?: number) => {
    toast.error(t(i18nKey, placeholders) as string, duration ? { duration } : undefined);
  };

  /**
   * Exibe toast de aviso
   */
  const showWarning = (i18nKey: string, placeholders?: Record<string, any>, duration?: number) => {
    toast.warning(t(i18nKey, placeholders) as string, duration ? { duration } : undefined);
  };

  /**
   * Exibe toast de informação
   */
  const showInfo = (i18nKey: string, placeholders?: Record<string, any>, duration?: number) => {
    toast.info(t(i18nKey, placeholders) as string, duration ? { duration } : undefined);
  };

  return {
    handleError,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}