
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';

const SubmitComplaint = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Limit to 3 files
      if (images.length + filesArray.length > 3) {
        toast({
          title: "Maximum 3 images allowed",
          description: "Please remove some images before adding more.",
          variant: "destructive",
        });
        return;
      }
      
      // Create preview URLs
      const newImageUrls = filesArray.map(file => URL.createObjectURL(file));
      
      setImages([...images, ...filesArray]);
      setImagesPreviews([...imagesPreviews, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];
    
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setImagesPreviews(newPreviews);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      
      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been successfully submitted. We'll respond to you soon.",
        variant: "default",
      });
      
      // Reset form after submission
      setSubject('');
      setDescription('');
      setPriority('medium');
      setImages([]);
      setImagesPreviews([]);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tenant-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Submit Complaint</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Submit a Complaint</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {submitted ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-10"
          >
            <div className="bg-green-100 rounded-full p-4 mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Complaint Submitted Successfully!</h3>
            <p className="text-gray-600 max-w-md mb-6">
              Thank you for submitting your complaint. Your complaint has been recorded with a reference number and will be addressed as soon as possible.
            </p>
            <Button onClick={() => setSubmitted(false)}>Submit Another Complaint</Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                type="text"
                placeholder="Enter the subject of your complaint"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Please describe your issue in detail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priority"
                    value="low"
                    checked={priority === 'low'}
                    onChange={() => setPriority('low')}
                    className="mr-2"
                  />
                  <span>Low</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priority"
                    value="medium"
                    checked={priority === 'medium'}
                    onChange={() => setPriority('medium')}
                    className="mr-2"
                  />
                  <span>Medium</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="priority"
                    value="high"
                    checked={priority === 'high'}
                    onChange={() => setPriority('high')}
                    className="mr-2"
                  />
                  <span>High</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Images (Optional)</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  multiple
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Plus className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-gray-600">Click to upload images</span>
                  <span className="text-gray-400 text-sm mt-1">Maximum 3 images</span>
                </label>
              </div>
              
              {imagesPreviews.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-4">
                  {imagesPreviews.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <span className="flex items-center">
                  <Send className="mr-2 h-4 w-4" />
                  Submit Complaint
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitComplaint;
