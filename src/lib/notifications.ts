import { toast } from "sonner";
import nodemailer from 'nodemailer';

type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
type NotificationType = 'email' | 'sms' | 'app';
type NotificationEvent = 'donation' | 'appointment' | 'lowStock' | 'eligibility' | 'request';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  app: boolean;
  bulkNotifications: boolean;
}

interface NotificationData {
  recipient: string;
  subject?: string;
  message: string;
  event: NotificationEvent;
  bloodType?: BloodType;
  units?: number;
}

// Function to check if the email is valid
const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Real email sending implementation 
// const sendRealEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
//   try {
//     const transporter = nodemailer.createTransport({
//       service: 'gmail', // or any other email service
//       auth: {
//         user: 'your-email@gmail.com', 
//         pass: 'your-email-password', 
//       },
//     });

//     const mailOptions = {
//       from: 'noreply@blooddonation.com', // Sender address
//       to, // List of recipients
//       subject, // Subject line
//       text: body, // Plain text body
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log('Email sent:', info.response);
//     return true;
//   } catch (error) {
//     console.error("Error sending real email:", error);
//     return false;
//   }
// };

// Send email notification
export const sendEmailNotification = async (data: NotificationData): Promise<boolean> => {
  console.log(`Sending email notification to ${data.recipient}`);
  console.log(`Subject: ${data.subject}`);
  console.log(`Message: ${data.message}`);

  // Validate email
  if (!isValidEmail(data.recipient)) {
    console.error("Invalid email address:", data.recipient);
    toast.error("Failed to send email notification", {
      description: "Invalid email address provided."
    });
    return false;
  }

  try {
    const emailConfig = await fetch('/api/email-config'); // Simulated config endpoint
    const configData = await emailConfig.json();
    const useRealEmailService = configData.useRealEmailService || false;
    let success = false;

    if (useRealEmailService) {
      success = await sendRealEmail(
        data.recipient,
        data.subject || `Notification: ${data.event}`,
        data.message
      );

      if (success) {
        toast.success("Email notification sent", {
          description: `Email sent to ${data.recipient}`
        });
      } else {
        toast.error("Failed to send email notification", {
          description: "Email service error. Please check your configuration."
        });
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      success = true;

      toast.success("Email notification sent", {
        description: `[SIMULATED] Email sent to ${data.recipient}`
      });
    }

    // Save notification data (to an external database or API)
    const userData = await fetch('/api/get-user'); // Simulated API to get user info
    const user = await userData.json();
    if (!user) {
      console.error("User not authenticated");
      return success;
    }

    await fetch('/api/save-notification', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: user.id,
        subject: data.subject,
        message: data.message,
        event_type: data.event,
        blood_type: data.bloodType,
        units: data.units,
        is_bulk: false,
        status: success ? 'sent' : 'failed',
        sent_at: new Date().toISOString()
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return success;
  } catch (error) {
    console.error("Error sending email notification:", error);
    toast.error("Failed to send email notification", {
      description: "An error occurred while sending the email."
    });
    return false;
  }
};

// Function to send a donation confirmation email
export const sendDonationConfirmation = async (donorEmail: string, bloodType: BloodType, donationDate: string, location: string): Promise<void> => {
  const subject = "Thank You for Your Blood Donation";
  const message = `Thank you for your generous blood donation (type ${bloodType}) on ${donationDate} at ${location}. Your donation can save up to 3 lives. You will be eligible to donate again in 56 days.`;

  await sendEmailNotification({
    recipient: donorEmail,
    subject,
    message,
    event: 'donation',
    bloodType
  });
};

// Function to send an appointment reminder email
export const sendAppointmentReminder = async (userEmail: string, appointmentDate: string, location: string, timeSlot: string): Promise<void> => {
  const subject = "Reminder: Upcoming Blood Donation Appointment";
  const message = `This is a reminder about your upcoming blood donation appointment on ${appointmentDate} at ${location} during the ${timeSlot} time slot. Please remember to bring a valid ID and stay hydrated.`;

  await sendEmailNotification({
    recipient: userEmail,
    subject,
    message,
    event: 'appointment'
  });
};


// Function to notify low stock donors
export const notifyLowStockDonors = async (bloodType: BloodType, currentUnits: number, threshold: number): Promise<void> => {
  try {
    // Example: Get eligible donors from your API or database
    const eligibleDonors = [
      { email: 'donor1@example.com', bloodType: 'O+' },
      { email: 'donor2@example.com', bloodType: 'O+' },
    ]; // Replace with real data fetching logic

    const compatibleDonors = eligibleDonors.filter(donor => donor.bloodType === bloodType);

    if (compatibleDonors.length === 0) {
      console.log(`No eligible donors for blood type ${bloodType}`);
      return;
    }

    const recipientEmails = compatibleDonors.map(donor => donor.email);
    const subject = `Urgent: ${bloodType} Blood Stock is Low`;
    const message = `Our ${bloodType} blood supply is critically low with only ${currentUnits} units available. Your donation can save lives. Please consider donating soon.`;

    // Send email notifications to compatible donors
    await sendBulkNotification(recipientEmails, subject, message, 'lowStock', { bloodType, units: currentUnits });
  } catch (error) {
    console.error("Error notifying donors:", error);
    toast.error("Failed to send low stock notifications");
  }
};

// Function to get notification preferences (from a custom API or database)
export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    const response = await fetch(`/api/notification-preferences/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch notification preferences');
    const preferences = await response.json();
    return preferences;
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return { email: true, sms: false, app: true, bulkNotifications: true }; // Default preferences
  }
};

// Function to save notification preferences (to a custom API or database)
export const saveNotificationPreferences = async (userId: string, preferences: NotificationPreferences): Promise<void> => {
  try {
    const response = await fetch(`/api/notification-preferences/${userId}`, {
      method: 'POST',
      body: JSON.stringify(preferences),
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to save notification preferences');
    }
    toast.success("Notification preferences updated");
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    toast.error("Failed to save notification preferences");
  }
};

// Function to send bulk notifications
export const sendBulkNotification = async (recipients: string[], subject: string, message: string, event: NotificationEvent, details?: { bloodType?: BloodType, units?: number }): Promise<boolean> => {
  if (recipients.length === 0) {
    console.log("No recipients provided for bulk notification");
    return false;
  }

  try {
    const emailConfig = await fetch('/api/email-config');
    const configData = await emailConfig.json();
    const useRealEmailService = configData.useRealEmailService || false;

    if (useRealEmailService) {
      const response = await fetch('/api/send-bulk-email', {
        method: 'POST',
        body: JSON.stringify({
          recipients,
          subject,
          message,
          event,
          bloodType: details?.bloodType,
          units: details?.units
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Bulk email service error: ${data.message}`);
      }

      console.log("Bulk email response:", data);
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast.success("Bulk notification sent", {
      description: `Notification sent to ${recipients.length} recipients`
    });

    return true;
  } catch (error) {
    console.error("Error sending bulk notification:", error);
    toast.error("Failed to send bulk notification", {
      description: "An error occurred while sending notifications."
    });
    return false;
  }
};
