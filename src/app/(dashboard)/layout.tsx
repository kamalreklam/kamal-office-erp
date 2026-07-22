// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import CustomLayout from '@/components/layout/custom/custom-layout'

// Store + Toast Imports
import { StoreProvider } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  return (
    <Providers direction='rtl'>
      <StoreProvider>
        <CustomLayout>{children}</CustomLayout>
        <Toaster position='bottom-left' dir='rtl' richColors closeButton />
      </StoreProvider>
    </Providers>
  )
}

export default Layout
