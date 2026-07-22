import { redirect } from "next/navigation";

export default function EmployeeDetailPage({ params }: { params: { employeeId: string } }) {
  redirect(`/admin/team/${params.employeeId}`);
}
