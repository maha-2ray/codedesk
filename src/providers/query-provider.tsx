import React from 'react'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


const queryClient = new QueryClient();


const QueryProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </div>
  )
}

export default QueryProvider
