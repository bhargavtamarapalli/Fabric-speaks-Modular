'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { THEME } from '@/lib/admin/theme';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Specialized Error Boundary for the Admin Dashboard
 * Uses the Admin Design System (THEME) for consistency.
 */
export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AdminErrorBoundary] Caught an error:', error, errorInfo);
    
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '400px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: THEME.spacing.xl,
          background: THEME.colors.surface,
          borderRadius: THEME.radius.lg,
          border: `1px solid ${THEME.colors.error}44`,
          fontFamily: THEME.fonts.ui,
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: '480px' }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: THEME.spacing.md,
              color: THEME.colors.error 
            }}>
              ⚠️
            </div>
            
            <h2 style={{ 
              color: THEME.colors.ivory, 
              fontSize: THEME.fontSizes.xl,
              marginBottom: THEME.spacing.sm 
            }}>
              Something went wrong in the dashboard
            </h2>
            
            <p style={{ 
              color: THEME.colors.muted, 
              marginBottom: THEME.spacing.xl,
              lineHeight: 1.6 
            }}>
              An unexpected error occurred while rendering this section. 
              The error has been logged for our engineers.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                padding: THEME.spacing.md, 
                borderRadius: THEME.radius.md,
                marginBottom: THEME.spacing.xl,
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <code style={{ 
                  color: THEME.colors.error, 
                  fontSize: THEME.fontSizes.xs,
                  whiteSpace: 'pre-wrap',
                  fontFamily: THEME.fonts.mono
                }}>
                  {this.state.error.stack || this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{
                background: THEME.colors.gold,
                color: THEME.colors.surface,
                border: 'none',
                padding: '12px 24px',
                borderRadius: THEME.radius.md,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: THEME.fontSizes.base,
                transition: 'transform 0.1s, opacity 0.1s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              Reload Component
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
