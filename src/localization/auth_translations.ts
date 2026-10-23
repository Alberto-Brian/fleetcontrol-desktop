export const authTranslations = {
  en: {
    auth: {
      errors: {
        userNotFound:         "User not found",
        invalidPassword:      "Invalid password",
        userInactive:         "Inactive user",
        userAlreadyExists:    "A user already exists",
        wrongCurrentPassword: "Wrong current password",
        loginFailed:          "Login failed",
        logoutFailed:         "Failed to sign out",
        organizationMismatch: "This account belongs to a different company than the one licensed for this device.",
      },
      login: {
        subtitle:            "Sign in to manage your fleet",
        emailLabel:          "Email",
        emailPlaceholder:    "you@company.com",
        passwordLabel:       "Password",
        passwordPlaceholder: "Enter your password",
        showPassword:        "Show password",
        hidePassword:        "Hide password",
        submitButton:        "Sign in",
        submitButtonLoading: "Signing in…",
      },
      changePasswordRequired: {
        title:                  "Set your password",
        subtitle:                "This account ({{email}}) is using a temporary password — set a new one to continue",
        currentPasswordLabel:    "Temporary password",
        newPasswordLabel:        "New password",
        confirmPasswordLabel:    "Confirm new password",
        submitButton:            "Set password",
        submitButtonLoading:     "Setting…",
        backToLogin:             "Sign out",
        errors: {
          mismatch:      "The passwords don't match",
          tooShort:      "Password must be at least 8 characters",
          sameAsCurrent: "The new password must be different from the temporary one",
          failed:        "Could not set the new password",
        },
        toast: {
          success: "Password set. Welcome!",
        },
      },
      toast: {
        errorTitle:          "Error",
        successTitle:        "Success!",
        loginErrorTitle:     "Error signing in",
        loginSuccess:        "Signed in successfully",
        logoutErrorTitle:    "Error signing out",
        logoutSuccessTitle:  "Signed out",
        logoutSuccess:       "See you soon!",
      },
      setup: {
        passwordsDontMatch:  "Passwords do not match",
        passwordTooShort:    "Password must be at least 6 characters",
        userCreatedSuccess:  "User created. Sign in to continue.",
      },
      userMenu: {
        myAccount:      "My Account",
        profile:        "Profile",
        changePassword: "Change Password",
        loggingOut:     "Signing out...",
        logout:         "Sign out",
      },
      profile: {
        title:           "My Profile",
        name:            "Name",
        namePlaceholder: "Your full name",
        email:           "Email",
        avatarHint:      "Click to change",
        avatarRemove:    "Remove",
        avatarSizeError: "Image cannot exceed 2 MB",
        nameRequired:    "Name is required",
        saveSuccess:     "Profile updated successfully",
        saveError:       "Error updating profile",
        cancel:          "Cancel",
        save:            "Save",
        accessTitle:          "Access",
        accessLoading:        "Loading your effective access…",
        accessNone:           "No scopes assigned yet.",
        accessScopeOrg:       "Whole organization",
        accessScopeResources: "Specific resources",
        accessTotal:          "{{count}} permission in total",
        accessTotal_other:    "{{count}} permissions in total",
      },
      password: {
        title:             "Change Password",
        current:           "Current password",
        new:               "New password",
        confirm:           "Confirm new password",
        currentRequired:   "Enter the current password",
        changeSuccess:     "Password changed successfully",
        save:              "Change Password",
        offlineNotAllowed: "No internet connection. Changing your password requires being online, so the new password stays valid for your next login.",
      },
      // Fase 11B.11 — estados online/offline x sessão.
      session: {
        toast: {
          expiredTitle:         "Session expired",
          expiredDescription:   "Your session has expired. Sign in again.",
          revokedTitle:         "Session ended",
          revokedDescription:   "An administrator ended this session remotely. Sign in again.",
          invalidTitle:         "Invalid session",
          invalidDescription:   "Sign in again.",
        },
        badge: {
          offlineCacheValidTitle:         "Working offline",
          offlineCacheValidDescription:   "Using the last valid session. Remote changes will sync once you reconnect — role and permissions shown are not re-verified while offline.",
          offlineCacheExpiredTitle:       "Cached session expired",
          offlineCacheExpiredDescription: "Offline, and the saved session has expired. Connect to the Internet to sign in again.",
          noSessionOfflineTitle:          "No session available",
          noSessionOfflineDescription:    "Offline, with no previously saved session. Connect to the Internet to sign in.",
          // Achado real (2026-09-05): este banner só aparece DEPOIS do login
          // (App.tsx só monta LicenseGuard/este componente quando
          // isAuthenticated já é true) — nunca antes. A frase antiga ("Sign
          // in to...") dizia a uma pessoa já autenticada para iniciar sessão,
          // uma contradição óbvia. O que este estado realmente significa: a
          // app está ligada, mas não há (ainda, ou de todo) uma sessão
          // válida/em cache com o servidor — normalmente transitório.
          noSessionOnlineTitle:           "No live server session",
          noSessionOnlineDescription:     "Signed in locally, but without a verified session with the server yet. This is usually momentary and resolves on its own — if it persists, sign out and sign in again.",
        },
      },
    }
  },
  pt: {
    auth: {
      errors: {
        userNotFound:         "Utilizador não encontrado",
        invalidPassword:      "Senha incorrecta",
        userInactive:         "Utilizador inactivo",
        userAlreadyExists:    "Já existe um utilizador cadastrado",
        wrongCurrentPassword: "Senha actual incorrecta",
        loginFailed:          "Falha ao fazer login",
        logoutFailed:         "Falha ao sair",
        organizationMismatch: "Esta conta pertence a uma empresa diferente da licenciada para este dispositivo.",
      },
      login: {
        subtitle:            "Inicie sessão para gerir a sua frota",
        emailLabel:          "Email",
        emailPlaceholder:    "nome@empresa.ao",
        passwordLabel:       "Senha",
        passwordPlaceholder: "Introduza a sua senha",
        showPassword:        "Mostrar senha",
        hidePassword:        "Ocultar senha",
        submitButton:        "Entrar",
        submitButtonLoading: "A entrar…",
      },
      changePasswordRequired: {
        title:                  "Define a tua password",
        subtitle:                "Esta conta ({{email}}) está a usar uma password temporária — define uma nova para continuar",
        currentPasswordLabel:    "Password temporária",
        newPasswordLabel:        "Nova password",
        confirmPasswordLabel:    "Confirmar nova password",
        submitButton:            "Definir password",
        submitButtonLoading:     "A definir…",
        backToLogin:             "Terminar sessão",
        errors: {
          mismatch:      "As passwords não coincidem",
          tooShort:      "A password deve ter pelo menos 8 caracteres",
          sameAsCurrent: "A nova password tem de ser diferente da temporária",
          failed:        "Não foi possível definir a nova password",
        },
        toast: {
          success: "Password definida. Bem-vindo!",
        },
      },
      toast: {
        errorTitle:          "Erro",
        successTitle:        "Sucesso!",
        loginErrorTitle:     "Erro ao fazer login",
        loginSuccess:        "Login efectuado com sucesso",
        logoutErrorTitle:    "Erro ao sair",
        logoutSuccessTitle:  "Sessão encerrada",
        logoutSuccess:       "Até logo!",
      },
      setup: {
        passwordsDontMatch:  "As senhas não coincidem",
        passwordTooShort:    "A senha deve ter pelo menos 6 caracteres",
        userCreatedSuccess:  "Utilizador criado. Faça login para continuar.",
      },
      userMenu: {
        myAccount:      "Minha Conta",
        profile:        "Perfil",
        changePassword: "Alterar Senha",
        loggingOut:     "Saindo...",
        logout:         "Sair",
      },
      profile: {
        title:           "Meu Perfil",
        name:            "Nome",
        namePlaceholder: "O seu nome completo",
        email:           "Email",
        avatarHint:      "Clique para alterar",
        avatarRemove:    "Remover",
        avatarSizeError: "A imagem não pode exceder 2 MB",
        nameRequired:    "O nome é obrigatório",
        saveSuccess:     "Perfil actualizado com sucesso",
        saveError:       "Erro ao actualizar o perfil",
        cancel:          "Cancelar",
        save:            "Guardar",
        accessTitle:          "Acesso",
        accessLoading:        "A carregar o teu acesso efectivo…",
        accessNone:           "Ainda não tens nenhum scope atribuído.",
        accessScopeOrg:       "Organização inteira",
        accessScopeResources: "Recursos específicos",
        accessTotal:          "{{count}} permissão no total",
        accessTotal_other:    "{{count}} permissões no total",
      },
      password: {
        title:             "Alterar Senha",
        current:           "Senha actual",
        new:               "Nova senha",
        confirm:           "Confirmar nova senha",
        currentRequired:   "Introduza a senha actual",
        changeSuccess:     "Senha alterada com sucesso",
        save:              "Alterar Senha",
        offlineNotAllowed: "Sem ligação à internet. Mudar a senha exige estar online, para a nova senha ficar válida no próximo login.",
      },
      // Fase 11B.11 — estados online/offline x sessão.
      session: {
        toast: {
          expiredTitle:         "Sessão expirada",
          expiredDescription:   "A tua sessão expirou. Inicia sessão novamente.",
          revokedTitle:         "Sessão terminada",
          revokedDescription:   "Um administrador terminou esta sessão remotamente. Inicia sessão novamente.",
          invalidTitle:         "Sessão inválida",
          invalidDescription:   "Inicia sessão novamente.",
        },
        badge: {
          offlineCacheValidTitle:         "A trabalhar offline",
          offlineCacheValidDescription:   "A usar a última sessão válida. As alterações remotas sincronizam ao reconectar — o cargo e as permissões apresentados não estão a ser reverificados enquanto offline.",
          offlineCacheExpiredTitle:       "Sessão cacheada expirada",
          offlineCacheExpiredDescription: "Sem ligação, e a sessão guardada expirou. Liga-te à Internet para iniciar sessão novamente.",
          noSessionOfflineTitle:          "Sem sessão disponível",
          noSessionOfflineDescription:    "Sem ligação e sem nenhuma sessão anteriormente guardada. Liga-te à Internet para iniciar sessão.",
          // Achado real (2026-09-05): este banner só aparece DEPOIS do login
          // (App.tsx só monta o LicenseGuard/este componente quando
          // isAuthenticated já é true) — nunca antes. A frase antiga ("Inicia
          // sessão para...") dizia a alguém já autenticado para iniciar
          // sessão, uma contradição óbvia (foi o que motivou esta correcção).
          // O que este estado realmente significa: a app está ligada, mas
          // ainda não há (ou nunca chegou a haver) uma sessão válida/em cache
          // com o servidor — normalmente transitório.
          noSessionOnlineTitle:           "Sem sessão activa com o servidor",
          noSessionOnlineDescription:     "Sessão local iniciada, mas ainda sem uma sessão verificada com o servidor. Costuma resolver-se sozinho em poucos segundos — se persistir, termina sessão e inicia de novo.",
        },
      },
    }
  }
};
