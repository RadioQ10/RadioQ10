using Microsoft.EntityFrameworkCore;
using RadioQ10.Application.Interfaces;
using RadioQ10.Domain.Entities;
using RadioQ10.Infrastructure.Persistence;

namespace RadioQ10.Infrastructure.Services;

public sealed class UserService : IUserService
{
    private readonly IRadioDbContext _dbContext;

    public UserService(IRadioDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<RadioUser> RegisterAsync(string name, string ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre es obligatorio.", nameof(name));
        }

        var trimmedName = name.Trim();
        var normalizedIp = string.IsNullOrWhiteSpace(ipAddress) ? "0.0.0.0" : ipAddress.Trim();

        var existingUser = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Name == trimmedName && u.IpAddress == normalizedIp, cancellationToken);

        if (existingUser is not null)
        {
            return existingUser;
        }

        var user = new RadioUser
        {
            Id = Guid.NewGuid(),
            Name = trimmedName,
            IpAddress = normalizedIp,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Users.Add(user);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return user;
        }
        catch (DbUpdateException)
        {
            var existing = await _dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Name == trimmedName && u.IpAddress == normalizedIp, cancellationToken);
            if (existing is not null)
            {
                return existing;
            }

            throw;
        }
    }

    public Task<RadioUser?> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }
}
