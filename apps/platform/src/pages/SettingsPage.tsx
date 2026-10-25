import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@company-web/shared/ui';
import { Input } from '@company-web/shared/ui';
import { Label } from '@company-web/shared/ui';
import { Textarea } from '@company-web/shared/ui';
import { SelectField } from '@/components/crm/SelectField';
import { CURRENCIES, Currency } from '@/types/invoice';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  branch: z.string().optional(),
  defaultCurrency: z.enum(['LKR', 'NZD', 'AUD', 'USD', 'EUR', 'GBP']),
  quoteTerms: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function SettingsPage() {
  const { company, updateCompany } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(company.logo);
  const [signaturePreview, setSignaturePreview] = useState<string | undefined>(company.signature);

  // The company record arrives after the first render (and after a refresh),
  // so the form is filled whenever it loads, unless the user is mid-edit.
  const formValues = (): CompanyFormData => ({
    name: company.name,
    address: company.address,
    email: company.email,
    phone: company.phone,
    website: company.website || '',
    taxNumber: company.taxNumber || '',
    bankName: company.bankDetails?.bankName || '',
    accountName: company.bankDetails?.accountName || '',
    accountType: company.bankDetails?.accountType || '',
    accountNumber: company.bankDetails?.accountNumber || '',
    branch: company.bankDetails?.branch || '',
    defaultCurrency: company.defaultCurrency || 'NZD',
    quoteTerms: company.quoteTerms || '',
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: formValues(),
  });

  useEffect(() => {
    if (!company.id || isDirty) return;
    reset(formValues());
    setLogoPreview(company.logo);
    setSignaturePreview(company.signature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const onSubmit = async (data: CompanyFormData) => {
    setIsSaving(true);
    const { bankName, accountName, accountType, accountNumber, branch, ...companyData } = data;
    // The store shows the success or error message; only mark the form saved if it worked.
    const saved = await updateCompany({
      ...companyData,
      defaultCurrency: companyData.defaultCurrency as Currency,
      quoteTerms: companyData.quoteTerms || '',
      logo: logoPreview,
      signature: signaturePreview,
      bankDetails: {
        bankName: bankName || '',
        accountName: accountName || '',
        accountType: accountType || '',
        accountNumber: accountNumber || '',
        branch: branch || '',
      },
    });
    if (saved) reset(data);
    setIsSaving(false);
  };


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Manage your company profile and preferences"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Company Logo */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Company Logo</h2>
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="logo" className="cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                    Upload Logo
                  </span>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  Recommended: 200x200px, PNG or JPG
                </p>
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Company Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className="mt-1.5"
                  placeholder="Your Company Name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  className="mt-1.5"
                  placeholder="Level 1, 10 Queen Street&#10;Auckland 1010"
                  rows={3}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="mt-1.5"
                    placeholder="contact@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    className="mt-1.5"
                    placeholder="+64 21 123 4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  {...register('website')}
                  className="mt-1.5"
                  placeholder="www.yourcompany.com"
                />
              </div>

              <div>
                <Label htmlFor="taxNumber">GST number (optional)</Label>
                <Input
                  id="taxNumber"
                  {...register('taxNumber')}
                  className="mt-1.5"
                  placeholder="123-456-789"
                />
              </div>
            </div>
          </div>

          {/* Sales Defaults */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Sales Defaults</h2>
            <div className="space-y-4">
              <div className="max-w-[200px]">
                <Label htmlFor="defaultCurrency">Default currency</Label>
                <Controller
                  control={control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <SelectField
                      id="defaultCurrency"
                      className="mt-1.5"
                      value={field.value}
                      onChange={field.onChange}
                      options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                    />
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">Used for new deals, quotes and invoices.</p>
              </div>
              <div>
                <Label htmlFor="quoteTerms">Default quote terms</Label>
                <Textarea
                  id="quoteTerms"
                  {...register('quoteTerms')}
                  className="mt-1.5"
                  rows={4}
                  placeholder={'50% deposit to start, balance on delivery.\nPrices exclude GST unless stated.\nThis quote is valid for 30 days.'}
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Bank Details</h2>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    {...register('bankName')}
                    className="mt-1.5"
                    placeholder="Pan Asia Bank"
                  />
                </div>
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    {...register('accountName')}
                    className="mt-1.5"
                    placeholder="Your Company Name"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Input
                    id="accountType"
                    {...register('accountType')}
                    className="mt-1.5"
                    placeholder="Current Account"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...register('accountNumber')}
                    className="mt-1.5"
                    placeholder="1038 11 10 0461"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  {...register('branch')}
                  className="mt-1.5"
                  placeholder="Embilipitiya"
                />
              </div>
            </div>
          </div>

          {/* Digital Signature */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-4">Digital Signature</h2>
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden">
                {signaturePreview ? (
                  <img
                    src={signaturePreview}
                    alt="Digital signature"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">No signature</span>
                )}
              </div>
              <div>
                <Label htmlFor="signature" className="cursor-pointer">
                  <span className="inline-flex items-center justify-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                    Upload Signature
                  </span>
                  <Input
                    id="signature"
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureChange}
                    className="hidden"
                  />
                </Label>
                <p className="mt-2 text-sm text-muted-foreground">
                  Recommended: PNG with transparent background
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || (!isDirty && !logoPreview && !signaturePreview)}
              className="gap-2 bg-accent hover:bg-accent/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </AppLayout>
  );
}
