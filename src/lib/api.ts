// const import.meta.env.VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Function to record a donation after an appointment is completed
export async function recordDonation(donorId, bloodType, centerId, appointmentId) {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 42);

    const donationRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/donations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donor_id: donorId,
        blood_type: bloodType,
        units: 1,
        donation_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
        location_id: centerId,
        status: 'available'
      })
    });

    if (!donationRes.ok) throw new Error('Failed to insert donation');
    const data = await donationRes.json();

    if (appointmentId) {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
    }

    await fetch(`${import.meta.env.VITE_BACKEND_URL}/donors/${donorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_donation_date: new Date().toISOString() })
    });

    await updatePredictiveDemand(bloodType);

    return data;
  } catch (error) {
    console.error("Error recording donation:", error);
    throw error;
  }
}

// Function to get current blood inventory levels
export async function getBloodInventory() {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error getting blood inventory:", error);
    throw error;
  }
}

// Function to get stock alerts
export async function getStockAlerts() {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return await res.json();
  } catch (error) {
    console.error("Error getting stock alerts:", error);
    throw error;
  }
}

// Update predictive demand from new donations or requests
async function updatePredictiveDemand(bloodType) {
  try {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/predictive-demand/${bloodType}`, {
      method: 'PATCH'
    });
  } catch (error) {
    console.error("Error updating predictive demand:", error);
  }
}
