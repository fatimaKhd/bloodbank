import { useState, useEffect } from 'react';
import { Heart, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

type SocialLink = {
  id: string;
  platform: string;
  url: string;
  icon: string;
};

type ContactInfo = {
  address: string;
  city: string;
  phone: string;
  email: string;
};

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    address: "Martyrs' Square, Downtown Beirut",
    city: "Beirut, Lebanon",
    phone: "+961 1 123 456",
    email: "contact@lifeflow.lb"
  });

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        // Fetch contact info
        const contactRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/settings/contact-info`);

        const contentType = contactRes.headers.get("content-type");

        if (!contactRes.ok) {
          const rawError = await contactRes.text(); // read once for error message
          console.error("❌ Contact Info API failed:", contactRes.status, rawError);
          throw new Error(`Failed to fetch contact info`);
        }

        if (!contentType?.includes("application/json")) {
          const rawText = await contactRes.text(); // only if needed
          console.error("❌ Expected JSON but got:", contentType, rawText);
          throw new Error("Invalid response format");
        }

        const contact = await contactRes.json(); // ✅ only read here, once
        setContactInfo(contact);

        // Fetch social links
        const socialRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/settings/social-links`);
        if (socialRes.ok) {
          const social = await socialRes.json();
          setSocialLinks(social);
        } else {
          const socialError = await socialRes.text();
          console.error("❌ Failed to fetch social links:", socialRes.status, socialError);
          throw new Error(`Failed to fetch social links`);
        }

      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching footer data:', error.message);
        } else {
          console.error('Unexpected error:', error);
        }

        // Fallback
        setSocialLinks([
          { id: '1', platform: 'Facebook', url: '#', icon: 'facebook' },
          { id: '2', platform: 'Twitter', url: '#', icon: 'twitter' },
          { id: '3', platform: 'Instagram', url: '#', icon: 'instagram' },
          { id: '4', platform: 'LinkedIn', url: '#', icon: 'linkedin' }
        ]);
      }
    };

    fetchFooterData();
  }, []);



  // Helper function to render the appropriate icon
  const renderSocialIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'facebook':
        return <Facebook size={18} />;
      case 'twitter':
        return <Twitter size={18} />;
      case 'instagram':
        return <Instagram size={18} />;
      case 'linkedin':
        return <Linkedin size={18} />;
      default:
        return <Heart size={18} />;
    }
  };

  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center">
              <Heart className="h-6 w-6 text-bloodRed-600 mr-2" />
              <span className="text-xl font-semibold">LifeFlow</span>
            </Link>
            <p className="text-gray-600 text-sm">
              Connecting donors with those in need through innovative technology and compassionate care across Lebanon.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  className="text-gray-500 hover:text-bloodRed-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {renderSocialIcon(link.icon)}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'Home', href: '/' },
                { label: 'About Us', href: '/about' },
                { label: 'Donate Blood', href: '/donate' },
                { label: 'Request Blood', href: '/request' },
                { label: 'FAQs', href: '/about#faqs' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-bloodRed-600 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'Donor Guidelines', href: '/about#guidelines' },
                { label: 'Blood Types', href: '/about#blood-types' },
                { label: 'Health Information', href: '/about#health-info' },
                { label: 'Donation Process', href: '/donate#process' },
                { label: 'Research', href: '/about#research' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-bloodRed-600 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-bloodRed-500 mr-3 flex-shrink-0" />
                <span className="text-gray-600 text-sm">
                  {contactInfo.address}<br />
                  {contactInfo.city}
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 text-bloodRed-500 mr-3 flex-shrink-0" />
                <span className="text-gray-600 text-sm">{contactInfo.phone}</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 text-bloodRed-500 mr-3 flex-shrink-0" />
                <span className="text-gray-600 text-sm">{contactInfo.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} LifeFlow Blood Bank Lebanon. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/about#privacy" className="text-gray-500 hover:text-bloodRed-600 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/about#terms" className="text-gray-500 hover:text-bloodRed-600 text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
