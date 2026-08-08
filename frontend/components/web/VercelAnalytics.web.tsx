import React from 'react';
import { Analytics } from "@vercel/analytics/dist/react/index.js";
import { SpeedInsights } from "@vercel/speed-insights/dist/react/index.js";

export function VercelAnalytics() {
    return (
        <>
            <Analytics />
            <SpeedInsights />
        </>
    );
}
