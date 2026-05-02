import { redirect } from 'next/navigation'

export default async function BookingSuccessPage(props: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await props.searchParams
  if (ref) redirect(`/confirmation/${ref}`)
  redirect('/book')
}
