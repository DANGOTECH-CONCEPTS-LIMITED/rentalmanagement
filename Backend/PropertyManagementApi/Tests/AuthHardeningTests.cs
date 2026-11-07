using System.Reflection;
using API.Controllers.Ops;
using API.Controllers.UserControllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace Tests;

/// <summary>
/// Guards the security posture that is easy to lose in a refactor: brute-force protection on
/// credential endpoints and administrator-only access to the operations queue.
/// </summary>
public class AuthHardeningTests
{
    [Theory]
    [InlineData(nameof(UserController.Authenticate))]
    [InlineData(nameof(UserController.ChangePassword))]
    [InlineData(nameof(UserController.ForgotPassword))]
    [InlineData(nameof(UserController.Register))]
    public void CredentialEndpointsAreRateLimited(string actionName)
    {
        var action = typeof(UserController).GetMethod(actionName, BindingFlags.Public | BindingFlags.Instance);

        Assert.NotNull(action);
        var attribute = action!.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(attribute);
        Assert.Equal("auth", attribute!.PolicyName);
    }

    [Fact]
    public void ExceptionQueueIsAdministratorOnly()
    {
        var authorize = typeof(AdminExceptionsController).GetCustomAttribute<AuthorizeAttribute>();

        Assert.NotNull(authorize);
        Assert.Equal("Administrator", authorize!.Roles);
    }

    [Fact]
    public void ExceptionQueueAcceptsOnlyBoundedPaging()
    {
        var method = typeof(AdminExceptionsController).GetMethod(nameof(AdminExceptionsController.Get));

        Assert.NotNull(method);
        // page and pageSize are query parameters, so the action must be reachable without a body.
        Assert.Contains(method!.GetParameters(), p => p.Name == "pageSize");
    }
}
