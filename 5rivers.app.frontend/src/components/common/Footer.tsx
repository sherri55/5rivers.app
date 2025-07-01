import React from "react";
import Link from "next/link";
import { Truck, Phone, Mail, MapPin, Clock } from "lucide-react";

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-slate-200">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Company Info */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">5 Rivers Trucking</h3>
              <p className="text-slate-600 text-sm">Professional Hauling Services</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Reliable dump trucking services for construction, landscaping, and material 
            delivery throughout London, Ontario and surrounding areas.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-900">Quick Links</h4>
          <nav className="space-y-2">
            {[
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
              { label: "Admin Portal", href: "/gated" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-slate-600 hover:text-slate-900 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-900">Contact Info</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-slate-600">
              <Phone className="h-4 w-4 text-blue-600" />
              <span className="text-sm">+1 (226) 700-5268</span>
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <Mail className="h-4 w-4 text-blue-600" />
              <a
                href="mailto:info@5riverstruckinginc.ca"
                className="text-sm hover:text-slate-900 transition-colors"
              >
                info@5riverstruckinginc.ca
              </a>
            </div>
            <div className="flex items-center space-x-3 text-slate-600">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-sm">London, Ontario & Nearby Areas</span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-slate-900">Business Hours</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 text-slate-600">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="text-sm">
                <div>Mon - Fri: 7:00 AM - 6:00 PM</div>
                <div>Saturday: 8:00 AM - 4:00 PM</div>
                <div>Sunday: Emergency Only</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div className="text-slate-600 text-sm">
          &copy; {new Date().getFullYear()} 5 Rivers Trucking Inc. All rights reserved.
        </div>
        <div className="flex space-x-6 text-sm">
          <Link
            href="/privacy"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
