import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';

const SellerDirectAccess = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { directLogin } = useSellerAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const autoLogin = async () => {
      if (!sellerId) {
        setError('Invalid seller link');
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('sellers')
          .select('*')
          .eq('seller_id', sellerId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Seller not found');
          return;
        }

        // Auto-login this seller (bypass password check)
        directLogin(data);
        navigate('/seller-dashboard', { replace: true });
      } catch (err) {
        console.error('Direct access error:', err);
        setError('Failed to load seller dashboard');
      }
    };

    autoLogin();
  }, [sellerId, directLogin, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg font-medium">{error}</p>
          <p className="text-muted-foreground text-sm">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-lg text-muted-foreground">Loading dashboard...</div>
    </div>
  );
};

export default SellerDirectAccess;
