import { useState, useEffect } from 'react';
import { Home, MapPin, Phone, Mail, User, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

const PropertyDetails = () => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        const user = localStorage.getItem('user');
        if (!user) {
          throw new Error('No user found in localStorage');
        }
        
        const userData = JSON.parse(user);
        const { id, token } = userData;
        console.log('User:', userData);
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const response = await fetch(`http://3.216.182.63:8091/GetTenantById/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        setTenant(data);
      } catch (err) {
        console.error('Failed to fetch tenant data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenantData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64">Loading property details...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!tenant || !tenant.property) return <div>No property information available</div>;

  const { property } = tenant;
  const { owner } = property;
  
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
  src={`http://3.216.182.63:8091/${property.imageUrl}`} 
  alt={property.name} 
  className="object-cover w-full h-full"
  onError={(e) => {
    const img = e.target as HTMLImageElement;
    img.src = "/api/placeholder/800/600";
    img.alt = "Property image unavailable";
  }}
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
                    <span>{property.address}, {property.district}, {property.region}, {property.zipcode}</span>
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Property Type</h3>
                  <p>{property.type}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Description</h3>
                  <p>{property.description}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Number of Rooms</h3>
                  <p>{property.numberOfRooms}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Monthly Rent</h3>
                  <p className="font-semibold">{property.price} {property.currency}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Balance Due</h3>
                  <p>{tenant.balanceDue} {property.currency}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Date Moved In</h3>
                  <p className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>{new Date(tenant.dateMovedIn).toLocaleDateString()}</span>
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Next Payment Date</h3>
                  <p className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    <span>{new Date(tenant.nextPaymentDate).toLocaleDateString()}</span>
                  </p>
                </div>
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
                <p>{owner.fullName}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Phone</h3>
                <p className="flex items-center">
                  <Phone className="mr-1 h-4 w-4" />
                  <span>{owner.phoneNumber}</span>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1">Email</h3>
                <p className="flex items-center">
                  <Mail className="mr-1 h-4 w-4" />
                  <span>{owner.email}</span>
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