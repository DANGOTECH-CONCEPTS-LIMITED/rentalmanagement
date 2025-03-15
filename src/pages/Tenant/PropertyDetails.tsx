
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, MapPin, Phone, Mail, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

const PropertyDetails = () => {
  const [property, setProperty] = useState({
    id: 'PR001',
    name: 'Sunset Apartments',
    address: '123 Main Street, Apt 4B, Cityville, 12345',
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    area: '850 sq ft',
    rentAmount: '$1,200',
    leaseStart: '2023-01-01',
    leaseEnd: '2024-01-01',
    landlord: {
      name: 'Jojo J',
      phone: '(256) 123-4567',
      email: 'jojo@example.com'
    },
    amenities: ['Air Conditioning', 'Dishwasher', 'Laundry', 'Parking', 'Gym Access'],
    imageUrl: '../uploads/studioroom.jpg'
  });

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tenant-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Property Details</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Property Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Home className="mr-2 h-5 w-5" />
              {property.name}
            </CardTitle>
            <CardDescription>Details about your current rental property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video relative overflow-hidden rounded-lg mb-6">
              <img 
                src={property.imageUrl} 
                alt={property.name} 
                className="object-cover w-full h-full" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Property ID</h3>
                  <p>{property.id}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Address</h3>
                  <p className="flex items-start">
                    <MapPin className="mr-1 h-4 w-4 mt-1 flex-shrink-0" />
                    <span>{property.address}</span>
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Property Type</h3>
                  <p>{property.type}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Size</h3>
                  <p>{property.area}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Bedrooms</h3>
                  <p>{property.bedrooms}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Bathrooms</h3>
                  <p>{property.bathrooms}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Monthly Rent</h3>
                  <p className="font-semibold">{property.rentAmount}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Lease Period</h3>
                  <p className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>{property.leaseStart} to {property.leaseEnd}</span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium text-sm text-gray-500 mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity) => (
                  <span key={amenity} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Landlord Information
            </CardTitle>
            <CardDescription>Contact details for your landlord</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Name</h3>
                <p>{property.landlord.name}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Phone</h3>
                <p className="flex items-center">
                  <Phone className="mr-1 h-4 w-4" />
                  <span>{property.landlord.phone}</span>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Email</h3>
                <p className="flex items-center">
                  <Mail className="mr-1 h-4 w-4" />
                  <span>{property.landlord.email}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertyDetails;
