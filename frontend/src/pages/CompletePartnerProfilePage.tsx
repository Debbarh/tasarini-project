import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import CompletePartnerProfile from '@/components/partner/CompletePartnerProfile';

const CompletePartnerProfilePage: React.FC = () => {
  const { user } = useAuth();

  // Rediriger si pas connecté
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Rediriger si pas un partenaire
  if (!user.roles?.includes('partner')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CompletePartnerProfile />
    </div>
  );
};

export default CompletePartnerProfilePage;