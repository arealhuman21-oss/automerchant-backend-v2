import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';
import enTranslations from '@shopify/polaris/locales/en.json';

/**
 * App Bridge Wrapper for Shopify Embedded Apps
 * Provides Polaris theming and routing context with dark mode support
 */
function AppBridgeProvider({ children }) {
  const [colorScheme, setColorScheme] = useState(() => {
    return localStorage.getItem('shopify-color-scheme') || 'light';
  });

  useEffect(() => {
    console.log('🎨 AppBridge: Color scheme changed to:', colorScheme);
    localStorage.setItem('shopify-color-scheme', colorScheme);
    // Force re-render by updating document attribute
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
  }, [colorScheme]);

  // Pass setColorScheme to children via context or prop
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { colorScheme, setColorScheme });
    }
    return child;
  });

  return (
    <BrowserRouter>
      <AppProvider i18n={enTranslations} colorScheme={colorScheme}>
        {childrenWithProps}
      </AppProvider>
    </BrowserRouter>
  );
}

export default AppBridgeProvider;
