export function getMondayAndFriday() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { monday: monday.toISOString().split('T')[0], friday: friday.toISOString().split('T')[0] }
}
