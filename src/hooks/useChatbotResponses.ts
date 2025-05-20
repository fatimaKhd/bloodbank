
import { useState, useEffect } from 'react';
import { toast } from "sonner";

export type ChatbotResponse = {
  id: string;
  query_pattern: string;
  response_text: string;
  category: string;
  keywords: string[];
  created_at: string;
};

export function useChatbotResponses() {
  const [responses, setResponses] = useState<ChatbotResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoading(true);
        
        const res = await fetch('http://localhost:5000/chatbot-responses');
        if (!res.ok) throw new Error('Failed to fetch chatbot responses');
        
        const data = await res.json();
        setResponses(data || []);
      } catch (err) {
        console.error('Error fetching chatbot responses:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setLoading(false);
      }
    };
  
    fetchResponses();
  }, []);
  

  const addResponse = async (newResponse: Omit<ChatbotResponse, 'id' | 'created_at'>) => {
    try {
      const res = await fetch('http://localhost:5000/chatbot-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newResponse),
      });
  
      if (!res.ok) throw new Error('Failed to add response');
      
      const data = await res.json();
  
      setResponses(prev => [...prev, data]);
      toast.success('Response added successfully');
      return data;
    } catch (err) {
      console.error('Error adding response:', err);
      toast.error('Failed to add response');
      throw err;
    }
  };
  

  return { responses, loading, error, addResponse };
}
