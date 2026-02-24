export const translations = {
  pt: {
    // Sidebar
    sidebar: {
      settings:   "Configurações",
      help:       "Ajuda",
      logout:     "Sair",
      sections: {
        Dashboards: "Dashboards",
        Lives:      "Lives",
        "Operações":"Operações",
      },
    },
    // Menu items
    menu: {
      dashboard:        "Dashboard",
      dashboardMy:      "Meu Dashboard",
      agenda:           "Agenda de Lives",
      influencers:      "Influencers",
      relatorios:       "Relatórios",
      vendas:           "Vendas & Comissões",
      perfil:           "Meu Perfil",
    },
    // Configurações page
    config: {
      appearance:       "🎨 Aparência",
      appearanceDesc:   "Escolha como a interface será exibida.",
      lightMode:        "Modo Claro",
      darkMode:         "Modo Escuro",
      active:           "✓ Ativo",
      language:         "🌐 Idioma",
      languageDesc:     "Selecione o idioma da plataforma.",
      password:         "🔒 Alterar Senha",
      passwordDesc:     "Para sua segurança, use uma senha forte.",
      currentPass:      "Senha Atual",
      newPass:          "Nova Senha",
      confirmPass:      "Confirmar Nova Senha",
      savePass:         "🔒 Salvar Nova Senha",
      saving:           "⏳ Salvando...",
      passSuccess:      "✓ Senha alterada com sucesso!",
      // Erros
      errCurrentEmpty:  "Informe sua senha atual.",
      errTooShort:      "A nova senha deve ter pelo menos 8 caracteres.",
      errNoMatch:       "As senhas não coincidem.",
      errSamePass:      "A nova senha deve ser diferente da atual.",
      errWrongPass:     "Senha atual incorreta.",
      errInvalidSession:"Sessão inválida.",
      errUpdate:        "Erro ao atualizar senha. Tente novamente.",
      // Força de senha
      strengthWeak:     "Fraca",
      strengthMedium:   "Média",
      strengthStrong:   "Forte",
      strengthLabel:    "Força:",
      req8chars:        "Mínimo 8 caracteres",
      reqUpperLower:    "Maiúsculas e minúsculas",
      reqNumber:        "Pelo menos um número",
      reqSpecial:       "Pelo menos um caractere especial",
      // Confirmação
      passNoMatch:      "⚠️ As senhas não coincidem",
      passMatch:        "✓ Senhas coincidem",
    },
  },
  en: {
    // Sidebar
    sidebar: {
      settings:   "Settings",
      help:       "Help",
      logout:     "Logout",
      sections: {
        Dashboards: "Dashboards",
        Lives:      "Lives",
        "Operações":"Operations",
      },
    },
    // Menu items
    menu: {
      dashboard:        "Dashboard",
      dashboardMy:      "My Dashboard",
      agenda:           "Live Schedule",
      influencers:      "Influencers",
      relatorios:       "Reports",
      vendas:           "Sales & Commissions",
      perfil:           "My Profile",
    },
    // Settings page
    config: {
      appearance:       "🎨 Appearance",
      appearanceDesc:   "Choose how the interface is displayed.",
      lightMode:        "Light Mode",
      darkMode:         "Dark Mode",
      active:           "✓ Active",
      language:         "🌐 Language",
      languageDesc:     "Select the platform language.",
      password:         "🔒 Change Password",
      passwordDesc:     "For your security, use a strong password.",
      currentPass:      "Current Password",
      newPass:          "New Password",
      confirmPass:      "Confirm New Password",
      savePass:         "🔒 Save New Password",
      saving:           "⏳ Saving...",
      passSuccess:      "✓ Password changed successfully!",
      // Errors
      errCurrentEmpty:  "Enter your current password.",
      errTooShort:      "New password must be at least 8 characters.",
      errNoMatch:       "Passwords do not match.",
      errSamePass:      "New password must be different from current.",
      errWrongPass:     "Current password is incorrect.",
      errInvalidSession:"Invalid session.",
      errUpdate:        "Error updating password. Please try again.",
      // Password strength
      strengthWeak:     "Weak",
      strengthMedium:   "Medium",
      strengthStrong:   "Strong",
      strengthLabel:    "Strength:",
      req8chars:        "Minimum 8 characters",
      reqUpperLower:    "Uppercase and lowercase letters",
      reqNumber:        "At least one number",
      reqSpecial:       "At least one special character",
      // Confirmation
      passNoMatch:      "⚠️ Passwords do not match",
      passMatch:        "✓ Passwords match",
    },
  },
} as const;

export type Lang = keyof typeof translations;
export type Translations = typeof translations[Lang];
