import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-card flex items-center justify-between">
      <div>
        <Heading level="h2" className="txt-xlarge">
          Sign in to check out
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          Checkout is for members — sign in with your verified account to
          place this order.
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className="h-10"
            data-testid="sign-in-button"
          >
            Sign in
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
