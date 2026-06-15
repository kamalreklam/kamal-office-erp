'use client'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

const FooterContent = () => {
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p>
        <span className='text-textSecondary'>{`© ${new Date().getFullYear()} `}</span>
        <span className='text-textPrimary font-medium'>كمال للتجهيزات المكتبية</span>
        <span className='text-textSecondary'>{' — جميع الحقوق محفوظة'}</span>
      </p>
      {!isBreakpointReached && (
        <p className='text-textSecondary text-sm'>نظام إدارة المخزون والفواتير — حلب</p>
      )}
    </div>
  )
}

export default FooterContent
