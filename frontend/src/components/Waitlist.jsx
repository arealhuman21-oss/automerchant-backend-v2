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
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [totalSignups, setTotalSignups] = useState(null);
  const [alreadySignedUp, setAlreadySignedUp] = useState(false);

  // Fetch total signups on mount
  useEffect(() => {
    if (active && supabase) {
      fetchTotalSignups();
    }
  }, [active]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if dev email - skip waitlist
      if (email.toLowerCase() === DEV_EMAIL.toLowerCase()) {
        setTimeout(() => {
          setLoading(false);
          onClose();
          if (onDevAccess) {
            onDevAccess(); // Redirect to dashboard
          }
        }, 500);
        return;
      }

      // Insert into waitlist
      const { data: insertData, error: insertError } = await supabase
        .from('waitlist_emails')
        .insert([
          {
            email: email.toLowerCase(),
            name: name || null,
            shop_url: shopUrl || null,
          },
        ])
        .select();

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - already signed up
          setAlreadySignedUp(true);
          setLoading(false);
          return;
        }
        throw insertError;
      }

      // Increment counter
      const { error: updateError } = await supabase.rpc('increment_waitlist');

      if (updateError) {
        console.error('Error incrementing counter:', updateError);
        // Don't fail the signup if counter increment fails
      }

      // Fetch updated count
      await fetchTotalSignups();

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error('Waitlist error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setShopUrl('');
    setSuccess(false);
    setError('');
    setAlreadySignedUp(false);
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
              content: loading ? 'Joining...' : 'Join Waitlist',
              onAction: handleSubmit,
              loading,
              disabled: !email,
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
                You're part of the first 100 builders shaping AutoMerchant.
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

            <form onSubmit={handleSubmit}>
              <BlockStack gap="400">
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  requiredIndicator
                />

                <TextField
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name (optional)"
                  autoComplete="name"
                />

                <TextField
                  label="Shopify Store URL"
                  value={shopUrl}
                  onChange={setShopUrl}
                  placeholder="yourstore.myshopify.com (optional)"
                  helpText="If you have a Shopify store, we'd love to know!"
                />

                <Text variant="bodySm" as="p" tone="subdued">
                  Be among the first to experience AI-powered dynamic pricing for Shopify.
                </Text>
              </BlockStack>
            </form>
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
