import { toast } from "sonner";

// Example data fetching using fetch() or axios (based on your backend API setup)
// const API_URL = 'https://your-api-url.com'; // Replace with your API endpoint
const API_URL = 'http://localhost:5000';

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

type DemandForecast = {
  bloodType: BloodType;
  shortTermDemand: number; // Expected demand in next 7 days
  mediumTermDemand: number; // Expected demand in next 30 days
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
};

type InventoryLevel = {
  bloodType: BloodType;
  currentUnits: number;
  optimalUnits: number;
  expiringWithin7Days: number;
};

// Fetch AI forecast from our backend API
// export const getPredictiveDemand = async (): Promise<DemandForecast[]> => {
//   try {
//     const response = await fetch(`${API_URL}/predictive_demand`);
//     const data = await response.json();

//     // Handle API error
//     if (!response.ok) {
//       throw new Error(data.message || 'Error fetching predictive demand');
//     }

//     // Transform the data to match our expected format
//     return (data || []).map(item => ({
//       bloodType: item.blood_type as BloodType,
//       shortTermDemand: item.short_term_demand,
//       mediumTermDemand: item.medium_term_demand,
//       urgencyLevel: item.urgency_level as 'low' | 'medium' | 'high' | 'critical',
//       lastUpdated: new Date(item.last_updated)
//     }));
//   } catch (error) {
//     console.error("Error fetching predictive demand:", error);
//     toast.error('Failed to load predictive demand');
//     return [];
//   }
// };

export const getPredictiveDemand = async (): Promise<DemandForecast[]> => {
  try {
    const response = await fetch(`${API_URL}/predictive_demand`);
    const contentType = response.headers.get("content-type") || "";

    // If it's not a JSON response, log it and throw
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Invalid response format:", text);
      throw new Error("Invalid JSON response");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || "Error fetching predictive demand");
    }

    return (data || []).map(item => ({
      bloodType: item.blood_type as BloodType,
      shortTermDemand: item.short_term_demand,
      mediumTermDemand: item.medium_term_demand,
      urgencyLevel: item.urgency_level as 'low' | 'medium' | 'high' | 'critical',
      lastUpdated: new Date(item.last_updated)
    }));

  } catch (error) {
    console.error("Error fetching predictive demand:", error);
    toast.error("Failed to load predictive demand");
    return [];
  }
};


// Fetch current inventory data from backend API
//to be rechecked later on
export const getCurrentInventory = async (): Promise<InventoryLevel[]> => {
  try {
    // const response = await fetch(`${API_URL}/blood_inventory`);

    const response = await fetch(`${API_URL}/api/inventory`);
    const data = await response.json();

    // Handle API error
    if (!response.ok) {
      throw new Error(data.message || 'Error fetching blood inventory');
    }

    // Aggregate units by blood type
    const inventoryByBloodType = new Map<BloodType, number>();
    data?.forEach(item => {
      const bloodType = item.blood_type as BloodType;
      inventoryByBloodType.set(bloodType, (inventoryByBloodType.get(bloodType) || 0) + item.units);
    });

    // Get expiring units within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringResponse = await fetch(`${API_URL}/expiring_inventory?expiry_before=${sevenDaysFromNow.toISOString()}`);
    const expiringData = await expiringResponse.json();

    // Handle API error
    if (!expiringResponse.ok) {
      throw new Error(expiringData.message || 'Error fetching expiring units');
    }

    const expiringByBloodType = new Map<BloodType, number>();
    expiringData?.forEach(item => {
      const bloodType = item.blood_type as BloodType;
      expiringByBloodType.set(bloodType, (expiringByBloodType.get(bloodType) || 0) + item.units);
    });

    // Define optimal units for each blood type
    const optimalUnitsByBloodType: Record<BloodType, number> = {
      'O-': 50, 'O+': 70, 'A+': 60, 'A-': 30,
      'B+': 35, 'B-': 20, 'AB+': 15, 'AB-': 10
    };

    // Return the aggregated and transformed inventory data
    return (['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as BloodType[]).map(bloodType => ({
      bloodType,
      currentUnits: inventoryByBloodType.get(bloodType) || 0,
      optimalUnits: optimalUnitsByBloodType[bloodType],
      expiringWithin7Days: expiringByBloodType.get(bloodType) || 0
    }));

  } catch (error) {
    console.error("Error fetching current inventory:", error);
    toast.error('Failed to load current inventory');
    return [];
  }
};

// Generate donor recommendations based on inventory and predicted demand
export const getTargetedDonorRecommendations = async (bloodType: BloodType | null): Promise<string> => {
  try {
    const inventory = await getCurrentInventory();
    const demand = await getPredictiveDemand();

    if (!bloodType) {
      // Find the most needed blood type
      const criticalTypes = demand
        .filter(d => d.urgencyLevel === 'critical' || d.urgencyLevel === 'high')
        .sort((a, b) => {
          const aInv = inventory.find(i => i.bloodType === a.bloodType);
          const bInv = inventory.find(i => i.bloodType === b.bloodType);

          if (!aInv || !bInv) return 0;

          // Calculate inventory-to-demand ratio (lower is more critical)
          const aRatio = aInv.currentUnits / a.shortTermDemand;
          const bRatio = bInv.currentUnits / b.shortTermDemand;

          return aRatio - bRatio;
        });

      if (criticalTypes.length > 0) {
        bloodType = criticalTypes[0].bloodType;
      } else {
        bloodType = 'O-'; // Default to universal donor if nothing is critical
      }
    }

    const targetDemand = demand.find(d => d.bloodType === bloodType);
    const targetInventory = inventory.find(i => i.bloodType === bloodType);

    if (!targetDemand || !targetInventory) {
      return "We need donors of all blood types. Please consider donating today!";
    }

    if (targetInventory.currentUnits < targetInventory.optimalUnits * 0.3) {
      return `We urgently need ${bloodType} donors. Our inventory is critically low and patients' lives depend on these donations.`;
    } else if (targetInventory.currentUnits < targetInventory.optimalUnits * 0.7) {
      return `${bloodType} blood is in high demand. Your donation would help us meet patient needs in the coming days.`;
    } else if (targetInventory.expiringWithin7Days > targetInventory.currentUnits * 0.3) {
      return `We have ${bloodType} units that will expire soon. New fresh donations would help maintain our supply.`;
    } else {
      return `Our ${bloodType} supply is currently stable, but regular donations help us stay prepared for emergencies.`;
    }
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return "We always need blood donors of all types. Your donation can save up to three lives!";
  }
};

// Notify eligible donors based on AI recommendations
export const notifyEligibleDonors = async (bloodType: BloodType): Promise<void> => {
  try {
    const message = await getTargetedDonorRecommendations(bloodType);

    toast.success(`Notifications sent to eligible ${bloodType} donors`, {
      description: `Message: ${message.substring(0, 60)}...`,
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    toast.error("Failed to send donor notifications", {
      description: "Please try again later.",
    });
  }
};
