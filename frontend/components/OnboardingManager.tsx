
import { useAuth } from "@/contexts/AuthContext";
import SellerWelcomeModal from "@/components/SellerWelcomeModal";
import React, { useEffect, useState } from "react";

export default function OnboardingManager() {
    const { user, loading } = useAuth();
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            // Check if user is an ACTIVE seller and hasn't seen the welcome modal
            // Note: sellerHasSeenWelcomeModal might be undefined if false, so we check strictly !== true
            if (
                user.sellerStatus === 'APPROVED' &&
                user.sellerHasSeenWelcomeModal !== true
            ) {
                setShowWelcome(true);
            }
        }
    }, [user, loading]);

    if (!showWelcome) return null;

    return <SellerWelcomeModal visible={showWelcome} onClose={() => setShowWelcome(false)} />;
}
