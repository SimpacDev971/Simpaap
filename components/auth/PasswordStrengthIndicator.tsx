'use client';

import { useMemo } from 'react';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

const PASSWORD_MIN_LENGTH = 10;

export function checkPasswordRequirements(password: string) {
  return {
    hasMinLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const req = checkPasswordRequirements(password);
  return req.hasMinLength && req.hasUppercase && req.hasLowercase && req.hasDigit && req.hasSpecial;
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: PasswordStrengthIndicatorProps) {
  const requirements = useMemo(() => checkPasswordRequirements(password), [password]);

  const requirementsList: PasswordRequirement[] = [
    { label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`, met: requirements.hasMinLength },
    { label: 'Au moins une majuscule (A-Z)', met: requirements.hasUppercase },
    { label: 'Au moins une minuscule (a-z)', met: requirements.hasLowercase },
    { label: 'Au moins un chiffre (0-9)', met: requirements.hasDigit },
    { label: 'Au moins un caractère spécial (!@#$...)', met: requirements.hasSpecial },
  ];

  const metCount = requirementsList.filter(r => r.met).length;
  const strength = metCount / requirementsList.length;

  // Calculate strength bar color
  const getStrengthColor = () => {
    if (strength <= 0.2) return 'bg-red-500';
    if (strength <= 0.4) return 'bg-orange-500';
    if (strength <= 0.6) return 'bg-yellow-500';
    if (strength <= 0.8) return 'bg-lime-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength <= 0.2) return 'Très faible';
    if (strength <= 0.4) return 'Faible';
    if (strength <= 0.6) return 'Moyen';
    if (strength <= 0.8) return 'Fort';
    return 'Très fort';
  };

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Force du mot de passe</span>
          <span className={strength === 1 ? 'text-green-600 font-medium' : 'text-gray-500'}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className="space-y-1 text-sm">
          {requirementsList.map((req, index) => (
            <li
              key={index}
              className={`flex items-center gap-2 transition-colors duration-200 ${
                req.met ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {req.met ? (
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasswordStrengthIndicator;
