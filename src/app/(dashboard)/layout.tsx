// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import Providers from '@components/Providers'
import ScrollToTop from '@core/components/scroll-to-top'
import CustomLayout from '@/components/layout/custom/custom-layout'
import { FloatingDock } from '@/components/ui/floating-dock'

// Store + Toast Imports
import { StoreProvider } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'

const Layout = async (props: ChildrenType) => {
  const { children } = props

  return (
    <Providers direction='rtl'>
      <StoreProvider>
        <CustomLayout>{children}</CustomLayout>
        <ScrollToTop>
          <button
            type='button'
            aria-label='Scroll to top'
            className='flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg'
          >
            <i className='tabler-arrow-up text-base' />
          </button>
        </ScrollToTop>
        <FloatingDock />
        <Toaster position='bottom-left' dir='rtl' richColors closeButton />
      </StoreProvider>
    </Providers>
  )
}

export default Layout
