import { useState, useEffect } from 'react';
import {
  Modal,
  TextField,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
  Box,
} from '@shopify/polaris';
import { supabase } from '../lib/supabaseClient';

const DEV_EMAIL = 'arealhuman21@gmail.com';

export function WaitlistModal({ active, onClose, onDevAccess }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [totalSignups, setTotalSignups] = useState(null);
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);
  const [userEmail, setUserEmail] = useState(null);

  // Fetch total signups on mount and check auth status
  useEffect(() => {
    if (active && supabase) {
      fetchTotalSignups();
      checkAuthStatus();
    }
  }, [active]);

  const checkAuthStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        // Check if this is the dev email
        if (user.email.toLowerCase() === DEV_EMAIL.toLowerCase()) {
          setTimeout(() => {
            onClose();
            if (onDevAccess) {
              onDevAccess();
            }
          }, 500);
        }
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  };

  const fetchTotalSignups = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist_metrics')
        .select('total_signups')
        .eq('id', 1)
        .single();

      if (error) throw error;
      setTotalSignups(data?.total_signups || 0);
    } catch (err) {
      console.error('Error fetching signups:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Supabase is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) throw error;

      // The redirect will handle the rest
      // When user returns, checkAuthStatus will be called
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleAddToWaitlist = async (email) => {
    try {
      console.log('📝 Adding to waitlist:', email);

      // Try to insert into Supabase waitlist table FIRST (for counter)
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('waitlist_emails')
          .insert([{ email: email.toLowerCase() }])
          .select();

        if (insertError) {
          if (insertError.code === '23505') {
            console.log('User already in Supabase waitlist (duplicate)');
          } else {
            console.error('Waitlist insert error:', insertError);
          }
        } else {
          console.log('✅ Successfully added to Supabase waitlist');

          // Increment counter only if insert was successful
          const { error: updateError } = await supabase.rpc('increment_waitlist');
          if (updateError) {
            console.error('Error incrementing counter:', updateError);
          } else {
            console.log('✅ Counter incremented');
          }
        }

        // Fetch updated count
        await fetchTotalSignups();
      } catch (supabaseErr) {
        console.warn('Supabase operations failed (non-critical):', supabaseErr);
      }

      // Now check backend approval status (creates user in PostgreSQL)
      await checkUserApproval(email);

    } catch (err) {
      console.error('Waitlist error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const checkUserApproval = async (email) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/check-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to check approval status');
      }

      const data = await response.json();

      if (data.approved && data.token) {
        // User is approved! Store token and redirect to dashboard
        localStorage.setItem('authToken', data.token);
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/'; // Refresh to show dashboard
        }, 1500);
      } else if (data.suspended) {
        setError(data.message || 'Your account has been suspended. Please contact support.');
      } else {
        // User is pending approval
        setAlreadySignedUp(true);
      }
    } catch (err) {
      console.error('Approval check error:', err);
      // If check fails, just show as already signed up
      setAlreadySignedUp(true);
    }
  };

  // When user authenticates, add them to waitlist
  useEffect(() => {
    if (userEmail && !success && !alreadySignedUp) {
      handleAddToWaitlist(userEmail);
    }
  }, [userEmail]);

  const handleClose = () => {
    setSuccess(false);
    setError('');
    setAlreadySignedUp(false);
    setUserEmail(null);
    onClose();
  };

  return (
    <Modal
      open={active}
      onClose={handleClose}
      title={success || alreadySignedUp ? '' : 'Join the Waitlist'}
      primaryAction={
        success || alreadySignedUp
          ? {
              content: 'Close',
              onAction: handleClose,
            }
          : {
              content: loading ? 'Signing in...' : 'Sign in with Google',
              onAction: handleGoogleSignIn,
              loading,
            }
      }
      secondaryActions={
        success || alreadySignedUp
          ? []
          : [
              {
                content: 'Cancel',
                onAction: handleClose,
              },
            ]
      }
    >
      <Modal.Section>
        {success ? (
          <Box
            padding="600"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              color: 'white',
              animation: 'fadeIn 0.5s ease-in',
            }}
          >
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2" style={{ color: 'white', textAlign: 'center' }}>
                🎉 Welcome to the Future!
              </Text>
              <Text variant="bodyLg" as="p" style={{ color: 'white', lineHeight: '1.6' }}>
                You're part of the first builders shaping AutoMerchant.
                <br /><br />
                Our AI is learning fast — and with your feedback, we're turning it into something truly beautiful.
                <br /><br />
                Let's build the future of intelligent pricing together.
              </Text>
              {totalSignups !== null && (
                <Text variant="bodySm" as="p" style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: '16px' }}>
                  🚀 You're signup #{totalSignups}
                </Text>
              )}
            </BlockStack>
          </Box>
        ) : alreadySignedUp ? (
          <Banner status="info">
            <p>You're already on the waitlist! We'll be in touch soon. 🚀</p>
          </Banner>
        ) : (
          <BlockStack gap="400">
            {totalSignups !== null && (
              <Banner>
                <p>🚀 {totalSignups} people have already joined the waitlist!</p>
              </Banner>
            )}

            {error && (
              <Banner status="critical" onDismiss={() => setError('')}>
                <p>{error}</p>
              </Banner>
            )}

            <BlockStack gap="400">
              <Text variant="bodyLg" as="p" alignment="center">
                Sign in with your Google account to join the waitlist
              </Text>

              <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                Be among the first to experience AI-powered dynamic pricing for Shopify.
                We'll notify you when AutoMerchant launches.
              </Text>
            </BlockStack>
          </BlockStack>
        )}
      </Modal.Section>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Modal>
  );
}

export function WaitlistButton({ onDevAccess }) {
  const [modalActive, setModalActive] = useState(false);

  return (
    <>
      <Button
        size="large"
        onClick={() => setModalActive(true)}
        variant="primary"
      >
        Join the Waitlist
      </Button>

      <WaitlistModal
        active={modalActive}
        onClose={() => setModalActive(false)}
        onDevAccess={onDevAccess}
      />
    </>
  );
}
