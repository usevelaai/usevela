"use client";

import { AuthenticatedLayout } from "@/components/authenticated-layout";
import { PolarBilling } from "@/components/polar-billing";

export default function BillingPage() {
	return (
		<AuthenticatedLayout>
			<PolarBilling />
		</AuthenticatedLayout>
	);
}
