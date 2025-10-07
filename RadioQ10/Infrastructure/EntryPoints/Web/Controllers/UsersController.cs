using System.Linq;
using Microsoft.AspNetCore.Mvc;
using RadioQ10.Application.Interfaces;
using RadioQ10.Domain.Entities;
using RadioQ10.Infrastructure.EntryPoints.SignalR;

namespace RadioQ10.Infrastructure.EntryPoints.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> RegisterAsync([FromBody] RegisterUserRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var ipAddress = HttpContext.Request.Headers.TryGetValue("X-Forwarded-For", out var forwarded)
            ? forwarded.ToString().Split(',').FirstOrDefault()?.Trim() ?? HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
        var user = await _userService.RegisterAsync(request.Name, ipAddress, cancellationToken);
        return Ok(new UserDto(user.Id, user.Name));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(new UserDto(user.Id, user.Name));
    }


    [HttpGet("actuals")]
    public ActionResult Actuals()
    {
        return Ok(RadioHub.UsersActuals.Keys);
    }
}
