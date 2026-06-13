import { forwardRef, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Sheet, TextField, type SheetRef } from '@/components/ui';
import { toast } from '@/stores/toast';
import type { Customer } from '@/types/models';

import { useSaveCustomer } from '../hooks';

const SUGGESTED_TAGS = ['VIP', 'Regular', 'Wholesale', 'Parent', 'Online'];

export interface CustomerFormSheetProps {
  /** Editing target, or null for a new customer. */
  customer: Customer | null;
  onSaved?: (customer: Customer) => void;
  dismiss: () => void;
}

export const CustomerFormSheet = forwardRef<SheetRef, CustomerFormSheetProps>(
  function CustomerFormSheet({ customer, onSaved, dismiss }, ref) {
    const save = useSaveCustomer();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
      setName(customer?.name ?? '');
      setPhone(customer?.phone ?? '');
      setEmail(customer?.email ?? '');
      setNotes(customer?.notes ?? '');
      setTags(customer?.tags ?? []);
    }, [customer]);

    const submit = () => {
      if (name.trim().length < 2) {
        toast.error('Name needed', 'Give the customer a name.');
        return;
      }
      save.mutate(
        {
          id: customer?.id,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim(),
          tags,
        },
        {
          onSuccess: (saved) => {
            toast.success(customer ? 'Customer updated' : 'Customer added', saved.name);
            onSaved?.(saved);
            dismiss();
          },
        },
      );
    };

    return (
      <Sheet ref={ref} title={customer ? 'Edit customer' : 'New customer'}>
        <View className="gap-4">
          <TextField label="Full name" value={name} onChangeText={setName} autoFocus={!customer} />
          <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View className="flex-row flex-wrap gap-2">
            {SUGGESTED_TAGS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                selected={tags.includes(tag)}
                onPress={() =>
                  setTags((prev) =>
                    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                  )
                }
              />
            ))}
          </View>
          <TextField label="Notes" value={notes} onChangeText={setNotes} multiline />
          <Button
            label={customer ? 'Save changes' : 'Add customer'}
            size="lg"
            fullWidth
            loading={save.isPending}
            onPress={submit}
          />
        </View>
      </Sheet>
    );
  },
);
