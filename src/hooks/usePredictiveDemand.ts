
import { useState, useEffect } from 'react';

export type DemandForecast = {
  id: string;
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  short_term_demand: number;
  medium_term_demand: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  last_updated: string;
};

export function usePredictiveDemand() {
  const [demandForecasts, setDemandForecasts] = useState<DemandForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDemandData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/predictive-demand`);
        if (!res.ok) throw new Error('Failed to fetch predictive demand');
        const data = await res.json();
  
        const typedData: DemandForecast[] = data?.map((item: any) => ({
          id: item.id,
          blood_type: item.blood_type,
          short_term_demand: item.short_term_demand,
          medium_term_demand: item.medium_term_demand,
          urgency_level: item.urgency_level.toLowerCase() as 'low' | 'medium' | 'high' | 'critical',
          last_updated: item.last_updated,
        })) || [];
  
        setDemandForecasts(typedData);
      } catch (err) {
        console.error('Error fetching predictive demand data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
  
    fetchDemandData();
  
    // ❌ Remove Supabase realtime subscription
    // If you want live updates, you'll need to use WebSockets or Server-Sent Events in your backend
  }, []);
  

  return { demandForecasts, loading, error };
}

export default usePredictiveDemand;
