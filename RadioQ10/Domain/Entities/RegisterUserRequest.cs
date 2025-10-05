using System.ComponentModel.DataAnnotations;

namespace RadioQ10.Domain.Entities;

public sealed class RegisterUserRequest
{
    [Required]
    [StringLength(64, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
}
