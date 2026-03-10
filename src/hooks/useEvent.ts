import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import type { Tables } from "@/integrations/supabase/types"

//pour recuperer event.id event.name event.date

export const useEvent = () => {
  const { slug } = useParams()
  const [event, setEvent] = useState<Tables<"events"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const loadEvent = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()

      if (eventError) {
        setEvent(null)
        setError(eventError.message)
        setIsLoading(false)
        return
      }

      setEvent(data)
      setIsLoading(false)
    }

    loadEvent()
  }, [slug])

  return { event, isLoading, error }
}